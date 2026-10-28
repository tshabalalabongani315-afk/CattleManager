import axios from "axios";
import {
  EMPTY_REPLICA,
  addRecord,
  buildRecord,
  isTempId,
  newTempId,
  parseTarget,
  removeRecord,
  replaceCattle,
  resolveGet,
} from "./replica";
import { DATA_CHANGED_EVENT, SESSION_EXPIRED_EVENT, SYNC_COMPLETE_EVENT } from "./events";

const RETRY_MS = 30_000;
const MAX_ID_MAPPINGS = 1000;

const defaultIsOnline = () => typeof navigator === "undefined" || navigator.onLine !== false;
const isNetworkError = (err) => axios.isAxiosError(err) && !err.response && !axios.isCancel(err);
// No connection at all, or a gateway in front of the app saying the app itself can't be reached.
const isUnreachable = (err) => isNetworkError(err) || [502, 503, 504].includes(err?.response?.status);

// Adapters hand back the raw body (usually a string); axios parses it afterwards.
const asJson = (value) => {
  if (typeof value !== "string") return value ?? null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const answer = (config, status, data) => ({
  data,
  status,
  statusText: status === 204 ? "No Content" : "OK",
  headers: {},
  config,
  request: null,
});

const failure = (config, status, message) =>
  new axios.AxiosError(
    message,
    status >= 500 ? axios.AxiosError.ERR_BAD_RESPONSE : axios.AxiosError.ERR_BAD_REQUEST,
    config,
    null,
    { data: { error: message }, status, statusText: String(status), headers: {}, config }
  );

function describe(op) {
  const b = op.body ?? {};
  if (op.method === "DELETE") return "Delete a record";
  switch (op.resource) {
    case "cattle":
      return op.method === "PUT" ? `Edit animal ${b.tag ?? ""}`.trim() : `Add animal ${b.tag ?? ""}`.trim();
    case "daily-counts":
      return `Record a count of ${b.count}`;
    case "movements":
      return `Record ${String(b.type ?? "").toLowerCase()} of ${b.quantity}`;
    case "weights":
      return `Record a weight of ${b.weight_kg} kg`;
    case "vaccinations":
      return `Record ${b.vaccine_name ?? "a vaccination"}`;
    default:
      return "Save a change";
  }
}

/**
 * Offline support for the app's API client.
 *
 * It sits in front of the network as an axios adapter:
 *  - Reads go to the server as usual. When the server can't be reached (or
 *    changes are waiting to upload) they are answered from a local copy of the
 *    farm's data instead.
 *  - Writes to herd data go to the server as usual. When there is no signal
 *    they are applied to the local copy, saved in a queue, and uploaded in
 *    order once the connection returns. Every upload carries an
 *    Idempotency-Key, so a retry after a dropped connection can't double-count.
 *
 * Everything is scoped to the signed-in user. Signing out wipes the local copy
 * but keeps any changes that haven't uploaded yet, so they are not lost.
 */
export function createOffline({ api, raw, storage, emit, isOnline = defaultIsOnline, retryMs = RETRY_MS }) {
  const real = axios.getAdapter(api.defaults.adapter);

  let userId = null;
  let replica = null; // null until the first snapshot has been downloaded
  let outbox = []; // queued changes, oldest first
  let idMap = {}; // temporary id -> id the server assigned
  let ready = Promise.resolve();

  let flushing = false;
  let refreshing = false;
  let unreachable = false;
  let inFlightId = null;
  let writeEpoch = 0;
  let retryTimer = null;

  /* ---- observable status ---- */

  const listeners = new Set();
  const pendingOps = () => outbox.filter((o) => o.status === "pending");

  const computeStatus = () => ({
    online: isOnline() && !unreachable,
    pending: pendingOps().length,
    failed: outbox.filter((o) => o.status === "failed").map((o) => ({ id: o.id, label: describe(o), error: o.error })),
    syncing: flushing,
    hasCopy: replica !== null,
  });

  let status = computeStatus();
  const notify = () => {
    status = computeStatus();
    listeners.forEach((fn) => fn());
  };

  /* ---- persistence (serialised, so a slow write can't land after a newer one) ---- */

  let chain = Promise.resolve();
  const enqueueStorage = (fn) => {
    chain = chain.then(fn).catch(() => {});
    return chain;
  };
  const saveReplica = () => {
    const id = userId;
    const value = replica;
    if (id && value) enqueueStorage(() => storage.set(`replica:${id}`, value));
  };
  const saveQueue = () => {
    const id = userId;
    if (!id) return;
    const queue = outbox.map((o) => ({ ...o }));
    const map = { ...idMap };
    enqueueStorage(async () => {
      await storage.set(`outbox:${id}`, queue);
      await storage.set(`idmap:${id}`, map);
    });
  };

  /* ---- connectivity ---- */

  const reachable = () => {
    if (!unreachable) return;
    unreachable = false;
    notify();
  };
  const markUnreachable = () => {
    if (!unreachable) {
      unreachable = true;
      notify();
    }
    scheduleRetry();
  };
  // Try again later if the server is unreachable although the device thinks it is online.
  function scheduleRetry() {
    if (retryTimer || !userId || !isOnline()) return;
    retryTimer = setTimeout(() => {
      retryTimer = null;
      sync();
    }, retryMs);
  }

  /* ---- ids ---- */

  const recordMapping = (tempId, realId) => {
    idMap[tempId] = realId;
    const keys = Object.keys(idMap);
    if (keys.length > MAX_ID_MAPPINGS) for (const k of keys.slice(0, keys.length - MAX_ID_MAPPINGS / 2)) delete idMap[k];
  };

  /** Swaps any temporary ids in a request for the real ones, where known. */
  function rewriteIds(config) {
    const next = { ...config };
    const m = /\/(-\d+)$/.exec(config.url ?? "");
    if (m && idMap[m[1]] != null) next.url = config.url.replace(m[1], idMap[m[1]]);
    if (config.params && isTempId(config.params.cattle_id) && idMap[config.params.cattle_id] != null) {
      next.params = { ...config.params, cattle_id: idMap[config.params.cattle_id] };
    }
    const body = asJson(config.data);
    if (body && isTempId(body.cattle_id) && idMap[body.cattle_id] != null) {
      next.data = JSON.stringify({ ...body, cattle_id: idMap[body.cattle_id] });
    }
    return next;
  }

  /* ---- sign-in scope ---- */

  function setUser(user) {
    if (!user?.id || user.id === userId) return ready;
    const id = user.id;
    userId = id;
    replica = null;
    outbox = [];
    idMap = {};
    ready = (async () => {
      const [r, q, m] = await Promise.all([
        storage.get(`replica:${id}`),
        storage.get(`outbox:${id}`),
        storage.get(`idmap:${id}`),
      ]);
      if (userId !== id) return;
      replica = r ?? null;
      outbox = q ?? [];
      idMap = m ?? {};
      await storage.set("user", user);
      notify();
      sync();
    })();
    return ready;
  }

  /** Wipes the local copy of the farm, but keeps changes that haven't uploaded yet. */
  function signOut() {
    const id = userId;
    userId = null;
    replica = null;
    outbox = [];
    idMap = {};
    ready = Promise.resolve();
    clearTimeout(retryTimer);
    retryTimer = null;
    notify();
    return enqueueStorage(async () => {
      await storage.remove("user");
      if (id) await storage.remove(`replica:${id}`);
    });
  }

  /** For a deleted account: forget everything about it, including unuploaded changes. */
  function forget() {
    const id = userId;
    const done = signOut();
    if (!id) return done;
    return enqueueStorage(async () => {
      await storage.remove(`outbox:${id}`);
      await storage.remove(`idmap:${id}`);
    });
  }

  /* ---- reading ---- */

  function serveFromCopy(config, target) {
    if (!replica) return null;
    const result = resolveGet(replica, target, config.params);
    if (!result) return null;
    if (result.notFound) throw failure(config, 404, "Not found");
    return answer(config, 200, structuredClone(result.data));
  }

  async function handleMe(config) {
    try {
      const res = await real(config);
      reachable();
      const body = asJson(res.data);
      if (body?.user) await setUser(body.user);
      else if (body && userId) await signOut(); // the server says nobody is signed in
      return res;
    } catch (err) {
      if (!isUnreachable(err)) throw err;
      markUnreachable();
      const cached = await storage.get("user");
      if (!cached) throw err;
      await setUser(cached);
      return answer(config, 200, { user: cached });
    }
  }

  async function handleGet(config, target) {
    // Changes are still waiting (the server doesn't know about them yet), or we
    // already know the server can't be reached: the local copy is the answer.
    if (pendingOps().length || flushing || unreachable || !isOnline()) {
      const local = serveFromCopy(config, target);
      if (local) return local;
    }
    try {
      const res = await real(config);
      reachable();
      return res;
    } catch (err) {
      if (!isUnreachable(err)) throw err;
      markUnreachable();
      const local = serveFromCopy(config, target);
      if (local) return local;
      throw err;
    }
  }

  /* ---- writing ---- */

  function applyServerWrite(method, target, res) {
    if (!replica) return;
    const data = asJson(res.data);
    if (method === "post" && data?.id) replica = addRecord(replica, target.resource, data);
    else if (method === "put" && data?.id) replica = replaceCattle(replica, data);
    else if (method === "delete") replica = removeRecord(replica, target.resource, target.id);
    else return;
    writeEpoch++;
    saveReplica();
  }

  function checkDuplicateTag(config, body, ownId) {
    if (replica && body?.tag != null && replica.cattle.some((c) => c.tag === body.tag && c.id !== Number(ownId))) {
      throw failure(config, 409, "That record already exists");
    }
  }

  function enqueue(config, target, method, body, key) {
    const { resource } = target;
    if (resource === "cattle" && method !== "delete") checkDuplicateTag(config, body, target.id);

    const op = {
      id: key,
      method: method.toUpperCase(),
      resource,
      url: config.url,
      body: body ?? null,
      createdAt: Date.now(),
      status: "pending",
    };

    let code;
    let data;
    if (method === "post") {
      op.tempId = newTempId();
      data = buildRecord(resource, body, op.tempId, replica ?? EMPTY_REPLICA);
      if (replica) replica = addRecord(replica, resource, data);
      code = 201;
    } else if (method === "put") {
      const current = replica?.cattle.find((c) => c.id === Number(target.id));
      data = { ...(current ?? { id: Number(target.id) }), ...body };
      if (replica && current) replica = replaceCattle(replica, data);
      code = 200;
    } else {
      if (replica) replica = removeRecord(replica, resource, target.id);
      code = 204;
    }

    outbox = [...outbox, op];
    writeEpoch++;
    saveReplica();
    saveQueue();
    notify();
    if (isOnline() && !unreachable) flush();
    else scheduleRetry();
    return answer(config, code, data);
  }

  // The thing being deleted was created on this device and never uploaded:
  // forget it (and anything queued against it) instead of sending a delete.
  function cancelCreated(config, create) {
    const tempId = create.tempId;
    const dependsOn = (o) => o.tempId === tempId || o.url.endsWith(`/${tempId}`) || o.body?.cattle_id === tempId;
    outbox = outbox.filter((o) => !(o.status === "pending" && o.id !== inFlightId && dependsOn(o)));
    if (replica) replica = removeRecord(replica, create.resource, tempId);
    writeEpoch++;
    saveReplica();
    saveQueue();
    notify();
    return answer(config, 204, undefined);
  }

  // Editing something created on this device and never uploaded: fold the edit into its queued create.
  function editCreated(config, create, body) {
    checkDuplicateTag(config, body, create.tempId);
    create.body = { ...create.body, ...body };
    const data = buildRecord("cattle", create.body, create.tempId, replica ?? EMPTY_REPLICA);
    if (replica) replica = replaceCattle(replica, data);
    writeEpoch++;
    saveReplica();
    saveQueue();
    notify();
    return answer(config, 200, data);
  }

  async function handleWrite(config, target, method) {
    const body = asJson(config.data);
    const key = globalThis.crypto.randomUUID();

    if (isTempId(target.id)) {
      const create = outbox.find((o) => o.tempId === Number(target.id) && o.status === "pending" && o.id !== inFlightId);
      if (create && method === "delete") return cancelCreated(config, create);
      if (create && method === "put") return editCreated(config, create, body);
    }

    // Anything that depends on, or must stay in order behind, queued work waits in
    // line. So does everything while the server is known to be unreachable, rather
    // than making the user sit through a timeout first.
    const mustQueue =
      isTempId(target.id) ||
      isTempId(body?.cattle_id) ||
      pendingOps().length > 0 ||
      flushing ||
      unreachable ||
      !isOnline();

    if (!mustQueue) {
      if (method === "post") config.headers?.set?.("Idempotency-Key", key);
      try {
        const res = await real(config);
        reachable();
        applyServerWrite(method, target, res);
        return res;
      } catch (err) {
        // Anything but "couldn't reach the server" is a real answer (validation, 404...).
        if (!isUnreachable(err)) throw err;
        markUnreachable();
      }
    }
    return enqueue(config, target, method, body, key);
  }

  /* ---- the adapter ---- */

  async function handle(config) {
    const method = (config.method ?? "get").toLowerCase();

    if (method === "get" && config.url === "/auth/me") return handleMe(config);

    const target = parseTarget(config.url);
    if (!target) return real(config);

    await ready;
    const request = rewriteIds(config);
    if (method === "get") return handleGet(request, target);
    if (target.resource === "dashboard" || !["post", "put", "delete"].includes(method)) return real(request);
    return handleWrite(request, { ...target, id: parseTarget(request.url).id }, method);
  }

  api.defaults.adapter = handle;

  /* ---- uploading the queue ---- */

  function resolveOp(op) {
    let url = op.url;
    const body = op.body ? { ...op.body } : undefined;
    const m = /\/(-\d+)$/.exec(url);
    if (m) {
      if (idMap[m[1]] == null) return null;
      url = url.replace(m[1], idMap[m[1]]);
    }
    if (body && isTempId(body.cattle_id)) {
      if (idMap[body.cattle_id] == null) return null;
      body.cattle_id = idMap[body.cattle_id];
    }
    return { url, body };
  }

  const fail = (op, message) => {
    op.status = "failed";
    op.error = message;
    saveQueue();
    notify();
  };

  async function flush() {
    if (flushing || !userId) return;
    flushing = true;
    notify();

    let uploaded = 0;
    let blocked = false;
    try {
      for (;;) {
        const op = outbox.find((o) => o.status === "pending");
        if (!op) break;

        const request = resolveOp(op);
        if (!request) {
          fail(op, "This belongs to an animal that couldn't be saved.");
          continue;
        }

        inFlightId = op.id;
        try {
          const res = await raw.request({
            method: op.method,
            url: request.url,
            data: request.body,
            headers: { "Idempotency-Key": op.id },
          });
          reachable();
          if (op.resource === "cattle" && op.method === "POST") recordMapping(op.tempId, res.data.id);
          outbox = outbox.filter((o) => o.id !== op.id);
          uploaded++;
          saveQueue();
          notify();
        } catch (err) {
          const code = err.response?.status;
          if (isUnreachable(err)) {
            markUnreachable();
            blocked = true;
          } else if (code === 401) {
            emit(SESSION_EXPIRED_EVENT);
            blocked = true;
          } else if (code === 429 || code >= 500 || (code === 409 && err.response.headers?.["retry-after"])) {
            scheduleRetry();
            blocked = true;
          } else if (op.method === "DELETE" && code === 404) {
            outbox = outbox.filter((o) => o.id !== op.id); // already gone, which is what was wanted
            saveQueue();
            notify();
            continue;
          } else {
            fail(op, err.response?.data?.error ?? "The server rejected this change.");
            continue;
          }
          break;
        } finally {
          inFlightId = null;
        }
      }
    } finally {
      flushing = false;
      notify();
    }

    if (!blocked) await refreshSnapshot();
    if (uploaded) {
      emit(DATA_CHANGED_EVENT);
      emit(SYNC_COMPLETE_EVENT);
    }
  }

  /** Replaces the local copy with the server's, unless something changed while it was downloading. */
  async function refreshSnapshot() {
    if (refreshing || !userId) return;
    const id = userId;
    refreshing = true;
    try {
      for (let attempt = 0; attempt < 3; attempt++) {
        const epoch = writeEpoch;
        const res = await raw.get("/sync/snapshot");
        reachable();
        if (userId !== id) return;
        if (epoch !== writeEpoch || pendingOps().length) continue;
        replica = { ...EMPTY_REPLICA, ...res.data };
        saveReplica();
        notify();
        return;
      }
    } catch (err) {
      if (isUnreachable(err)) markUnreachable();
      else if (err.response?.status === 401) emit(SESSION_EXPIRED_EVENT);
    } finally {
      refreshing = false;
    }
  }

  /** Upload anything queued, then bring the local copy up to date. */
  async function sync() {
    await ready;
    if (!userId || !isOnline()) return;
    if (pendingOps().length) await flush();
    else await refreshSnapshot();
  }

  async function dismissFailed(id) {
    outbox = outbox.filter((o) => o.id !== id);
    saveQueue();
    notify();
    // Drop the optimistic copy of the rejected change.
    await refreshSnapshot();
    emit(DATA_CHANGED_EVENT);
    emit(SYNC_COMPLETE_EVENT);
  }

  return {
    setUser,
    signOut,
    forget,
    sync,
    dismissFailed,
    /** The browser reports a connection again. */
    handleOnline() {
      unreachable = false;
      notify();
      sync();
    },
    handleOffline: notify,
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    getStatus: () => status,
    /** Whether any changes are still waiting to upload (used to warn before signing out). */
    hasPending: () => pendingOps().length > 0,
  };
}
