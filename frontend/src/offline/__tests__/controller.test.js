import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";
import { createOffline } from "../controller";
import { createStorage } from "../storage";
import { DATA_CHANGED_EVENT, SESSION_EXPIRED_EVENT, SYNC_COMPLETE_EVENT } from "../events";

/* ---- a stand-in for the API, with the behaviours that matter for syncing ---- */

function fakeServer() {
  const s = {
    down: false, // every request fails as if there were no signal
    dropNextResponse: false, // the server does the work but the reply never arrives
    rejectWith: null, // force the next write to fail with this status
    calls: [],
    replays: 0,
    nextId: 100,
    keys: new Map(),
    db: { cattle: [], dailyCounts: [], movements: [], vaccinations: [], weights: [] },
  };

  const respond = (config, status, data) => {
    const response = { data: data === undefined ? "" : JSON.stringify(data), status, statusText: "", headers: {}, config };
    if (status < 400) return response;
    throw new axios.AxiosError(`HTTP ${status}`, "ERR_BAD_REQUEST", config, null, {
      ...response,
      data: data ?? {},
    });
  };

  s.adapter = async (config) => {
    const method = config.method.toLowerCase();
    const url = config.url;
    const body = typeof config.data === "string" ? JSON.parse(config.data) : (config.data ?? null);
    const key = config.headers?.get?.("Idempotency-Key") || null;
    s.calls.push({ method, url, body, key });

    if (s.down) throw new axios.AxiosError("Network Error", "ERR_NETWORK", config);
    if (s.gatewayDown) return respond(config, 503, { error: "Service Unavailable" });
    if (s.rejectWith && method !== "get") {
      const status = s.rejectWith;
      s.rejectWith = null;
      return respond(config, status, { error: "Rejected" });
    }

    if (url === "/auth/me") return respond(config, 200, { user: { id: 1, username: "farmer" } });
    if (url === "/sync/snapshot") return respond(config, 200, structuredClone(s.db));

    if (method === "post" && key && s.keys.has(key)) {
      s.replays++;
      const stored = s.keys.get(key);
      return respond(config, stored.status, stored.body);
    }

    const [, resource, id] = /^\/([\w-]+)(?:\/(\d+))?/.exec(url);
    const table = { cattle: "cattle", "daily-counts": "dailyCounts", movements: "movements", vaccinations: "vaccinations", weights: "weights" }[resource];

    if (method === "get") {
      if (resource === "cattle" && id) {
        const row = s.db.cattle.find((c) => c.id === Number(id));
        return row ? respond(config, 200, row) : respond(config, 404, { error: "Not found" });
      }
      if (resource === "dashboard") return respond(config, 200, { registered: s.db.cattle.length });
      return respond(config, 200, structuredClone(s.db[table]));
    }

    let result;
    if (method === "post") {
      if (resource === "cattle" && s.db.cattle.some((c) => c.tag === body.tag)) {
        return respond(config, 409, { error: "That record already exists" });
      }
      if ((resource === "weights" || resource === "vaccinations") && !s.db.cattle.some((c) => c.id === body.cattle_id)) {
        return respond(config, 404, { error: "Not found" });
      }
      const row = { id: s.nextId++, ...body };
      if (resource === "cattle") Object.assign(row, { sex: null, date_of_birth: null, status: "Active", ...body, id: row.id });
      s.db[table].push(row);
      result = { status: 201, body: row };
    } else if (method === "put") {
      const row = s.db.cattle.find((c) => c.id === Number(id));
      if (!row) return respond(config, 404, { error: "Not found" });
      Object.assign(row, body);
      result = { status: 200, body: row };
    } else {
      const index = s.db[table].findIndex((r) => r.id === Number(id));
      if (index === -1) return respond(config, 404, { error: "Not found" });
      s.db[table].splice(index, 1);
      result = { status: 204, body: undefined };
    }

    if (key) s.keys.set(key, result);
    if (s.dropNextResponse) {
      s.dropNextResponse = false;
      throw new axios.AxiosError("Network Error", "ERR_NETWORK", config);
    }
    return respond(config, result.status, result.body);
  };

  return s;
}

/* ---- harness ---- */

const USER = { id: 1, username: "farmer" };
const today = new Date().toISOString().slice(0, 10);

function harness({ server = fakeServer(), storage = createStorage() } = {}) {
  const state = { online: true };
  const events = [];
  const api = axios.create({ baseURL: "/api", adapter: server.adapter });
  const raw = axios.create({ baseURL: "/api", adapter: server.adapter });
  const offline = createOffline({
    api,
    raw,
    storage,
    emit: (name) => events.push(name),
    isOnline: () => state.online,
    retryMs: 5,
  });
  const goOffline = () => {
    state.online = false;
    server.down = true;
    offline.handleOffline();
  };
  const goOnline = () => {
    state.online = true;
    server.down = false;
    offline.handleOnline();
  };
  const idle = () => vi.waitFor(() => {
    const st = offline.getStatus();
    expect(st.syncing).toBe(false);
    expect(st.pending).toBe(0);
  });
  return { server, storage, api, offline, events, state, goOffline, goOnline, idle };
}

async function signedIn(options) {
  const h = harness(options);
  await h.offline.setUser(USER);
  await vi.waitFor(() => expect(h.offline.getStatus().hasCopy).toBe(true));
  return h;
}

beforeEach(() => vi.useRealTimers());

describe("while online", () => {
  it("reads and writes go straight to the server", async () => {
    const h = await signedIn();
    const created = await h.api.post("/cattle", { tag: "A1", breed: "Nguni" });
    expect(created.status).toBe(201);
    expect(created.data.id).toBeGreaterThan(0);
    expect((await h.api.get("/cattle")).data).toHaveLength(1);
    expect(h.server.db.cattle).toHaveLength(1);
    expect(h.offline.getStatus().pending).toBe(0);
  });

  it("sends an Idempotency-Key with every POST", async () => {
    const h = await signedIn();
    await h.api.post("/daily-counts", { count: 5, date: today });
    const post = h.server.calls.find((c) => c.method === "post");
    expect(post.key).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("treats a gateway error (the app is down behind a working network) like no connection", async () => {
    const h = await signedIn();
    await h.api.post("/cattle", { tag: "G1", breed: "Nguni" });
    h.server.gatewayDown = true;

    expect((await h.api.get("/cattle")).data.map((c) => c.tag)).toEqual(["G1"]);
    const res = await h.api.post("/daily-counts", { count: 2, date: today });
    expect(res.status).toBe(201);
    expect(h.offline.getStatus().pending).toBe(1);
  });

  it("passes server errors through untouched instead of queueing them", async () => {
    const h = await signedIn();
    await h.api.post("/cattle", { tag: "A1", breed: "Nguni" });
    await expect(h.api.post("/cattle", { tag: "A1", breed: "Nguni" })).rejects.toMatchObject({
      response: { status: 409 },
    });
    expect(h.offline.getStatus().pending).toBe(0);
  });

  it("downloads the whole farm as its local copy after sign-in", async () => {
    const server = fakeServer();
    server.db.cattle.push({ id: 1, tag: "OLD", breed: "Nguni", sex: null, date_of_birth: null, status: "Active" });
    const h = await signedIn({ server });
    h.goOffline();
    expect((await h.api.get("/cattle")).data.map((c) => c.tag)).toEqual(["OLD"]);
  });
});

describe("with no signal", () => {
  let h;
  beforeEach(async () => {
    h = await signedIn();
    await h.api.post("/cattle", { tag: "A1", breed: "Nguni" });
    h.goOffline();
  });

  it("serves reads from the local copy", async () => {
    expect((await h.api.get("/cattle")).data.map((c) => c.tag)).toEqual(["A1"]);
    expect((await h.api.get("/dashboard")).data.registered).toBe(1);
  });

  it("saves a new animal on the device and shows it straight away", async () => {
    const res = await h.api.post("/cattle", { tag: "A2", breed: "Bonsmara", sex: "Female" });
    expect(res.status).toBe(201);
    expect(res.data).toMatchObject({ tag: "A2", breed: "Bonsmara", sex: "Female", status: "Active" });
    expect(res.data.id).toBeLessThan(0);

    expect((await h.api.get("/cattle")).data.map((c) => c.tag)).toEqual(["A1", "A2"]);
    expect((await h.api.get(`/cattle/${res.data.id}`)).data.tag).toBe("A2");
    expect((await h.api.get("/dashboard")).data).toMatchObject({ registered: 2, active: 2 });
    expect(h.offline.getStatus()).toMatchObject({ online: false, pending: 1 });
  });

  it("makes no request to the server for a queued change", async () => {
    const before = h.server.calls.length;
    await h.api.post("/daily-counts", { count: 33, date: today });
    expect(h.server.calls.length).toBe(before);
    expect((await h.api.get("/daily-counts")).data[0]).toMatchObject({ count: 33, date: today });
    expect((await h.api.get("/dashboard")).data.latestCount.count).toBe(33);
  });

  it("refuses a duplicate tag just as the server would", async () => {
    await expect(h.api.post("/cattle", { tag: "A1", breed: "Nguni" })).rejects.toMatchObject({
      response: { status: 409 },
    });
    expect(h.offline.getStatus().pending).toBe(0);
  });

  it("applies queued edits and deletes to what is shown", async () => {
    const [cow] = (await h.api.get("/cattle")).data;
    await h.api.put(`/cattle/${cow.id}`, { tag: "A1", breed: "Nguni", status: "Sold" });
    expect((await h.api.get(`/cattle/${cow.id}`)).data.status).toBe("Sold");
    await h.api.delete(`/cattle/${cow.id}`);
    expect((await h.api.get("/cattle")).data).toEqual([]);
  });

  it("starts without a copy when the farm was never downloaded, and says so", async () => {
    const fresh = harness();
    fresh.goOffline();
    await fresh.offline.setUser({ id: 2, username: "other" });
    await expect(fresh.api.get("/cattle")).rejects.toMatchObject({ code: "ERR_NETWORK" });
    expect(fresh.offline.getStatus().hasCopy).toBe(false);
  });
});

describe("when the connection returns", () => {
  it("uploads queued changes in order, then shows the server's records", async () => {
    const h = await signedIn();
    h.goOffline();
    await h.api.post("/daily-counts", { count: 10, date: today });
    await h.api.post("/movements", { type: "SOLD", quantity: 2, date: today, note: "Auction" });
    expect(h.offline.getStatus().pending).toBe(2);

    h.goOnline();
    await h.idle();

    expect(h.server.db.dailyCounts).toHaveLength(1);
    expect(h.server.db.movements[0]).toMatchObject({ type: "SOLD", quantity: 2, note: "Auction" });
    const order = h.server.calls.filter((c) => c.method === "post").map((c) => c.url);
    expect(order).toEqual(["/daily-counts", "/movements"]);
    expect(h.events).toContain(SYNC_COMPLETE_EVENT);
    expect(h.events).toContain(DATA_CHANGED_EVENT);

    const counts = (await h.api.get("/daily-counts")).data;
    expect(counts).toHaveLength(1);
    expect(counts[0].id).toBeGreaterThan(0); // the real record, not the temporary one
  });

  it("gives records made against a new animal the animal's real id", async () => {
    const h = await signedIn();
    h.goOffline();
    const cow = (await h.api.post("/cattle", { tag: "NEW1", breed: "Nguni" })).data;
    await h.api.post("/weights", { cattle_id: cow.id, date: today, weight_kg: 250 });
    await h.api.post("/vaccinations", { cattle_id: cow.id, vaccine_name: "Anthrax", date_given: today });
    // The profile page can show all of it while still offline.
    expect((await h.api.get("/weights", { params: { cattle_id: cow.id } })).data).toHaveLength(1);
    expect((await h.api.get("/vaccinations", { params: { cattle_id: cow.id } })).data[0].cattle_tag).toBe("NEW1");

    h.goOnline();
    await h.idle();

    const [saved] = h.server.db.cattle;
    expect(saved.tag).toBe("NEW1");
    expect(h.server.db.weights[0]).toMatchObject({ cattle_id: saved.id, weight_kg: 250 });
    expect(h.server.db.vaccinations[0]).toMatchObject({ cattle_id: saved.id, vaccine_name: "Anthrax" });

    // A page still open on the temporary address keeps working.
    expect((await h.api.get(`/cattle/${cow.id}`)).data.id).toBe(saved.id);
  });

  it("drops a record created and deleted before it was ever uploaded", async () => {
    const h = await signedIn();
    h.goOffline();
    const cow = (await h.api.post("/cattle", { tag: "GONE", breed: "Nguni" })).data;
    await h.api.post("/weights", { cattle_id: cow.id, date: today, weight_kg: 100 });
    await h.api.delete(`/cattle/${cow.id}`);

    expect(h.offline.getStatus().pending).toBe(0);
    h.server.calls.length = 0;
    h.goOnline();
    await vi.waitFor(() => expect(h.server.calls.length).toBeGreaterThan(0));
    expect(h.server.calls.some((c) => c.method !== "get")).toBe(false);
    expect(h.server.db.cattle).toHaveLength(0);
  });

  it("folds an edit of a not-yet-uploaded animal into its creation", async () => {
    const h = await signedIn();
    h.goOffline();
    const cow = (await h.api.post("/cattle", { tag: "TYPO", breed: "Nguni" })).data;
    await h.api.put(`/cattle/${cow.id}`, { tag: "FIXED", breed: "Nguni" });
    expect(h.offline.getStatus().pending).toBe(1);

    h.goOnline();
    await h.idle();
    expect(h.server.db.cattle.map((c) => c.tag)).toEqual(["FIXED"]);
    expect(h.server.calls.filter((c) => c.method === "put")).toHaveLength(0);
  });

  it("does not create a duplicate when the reply to an upload was lost", async () => {
    const h = await signedIn();
    h.server.dropNextResponse = true; // the server saves it, but we never hear back
    const res = await h.api.post("/movements", { type: "IN", quantity: 3, date: today });

    expect(res.status).toBe(201); // treated as saved on the device
    expect(h.server.db.movements).toHaveLength(1);
    expect(h.offline.getStatus().pending).toBe(1);

    h.goOnline();
    await h.idle();
    expect(h.server.db.movements).toHaveLength(1);
    expect(h.server.replays).toBe(1);
  });

  it("keeps working for the other records when one is rejected, and reports it", async () => {
    const h = await signedIn();
    h.goOffline();
    await h.api.post("/daily-counts", { count: 1, date: today });
    await h.api.post("/weights", { cattle_id: 424242, date: today, weight_kg: 100 }); // no such animal
    await h.api.post("/daily-counts", { count: 2, date: today });

    h.goOnline();
    await h.idle();

    expect(h.server.db.dailyCounts.map((c) => c.count)).toEqual([1, 2]);
    const { failed } = h.offline.getStatus();
    expect(failed).toHaveLength(1);
    expect(failed[0].label).toMatch(/weight/i);

    await h.offline.dismissFailed(failed[0].id);
    expect(h.offline.getStatus().failed).toHaveLength(0);
  });

  it("fails dependants of an animal the server refused", async () => {
    const h = await signedIn();
    await h.api.post("/cattle", { tag: "TAKEN", breed: "Nguni" });
    h.goOffline();
    // Another phone added TAKEN meanwhile; this one doesn't know yet.
    h.server.db.cattle.length = 0;
    await h.api.post("/cattle", { tag: "TAKEN", breed: "Nguni" }).catch(() => {});
    const cow = (await h.api.post("/cattle", { tag: "CLASH", breed: "Nguni" })).data;
    await h.api.post("/weights", { cattle_id: cow.id, date: today, weight_kg: 100 });
    h.server.db.cattle.push({ id: 900, tag: "CLASH", breed: "x", sex: null, date_of_birth: null, status: "Active" });

    h.goOnline();
    await h.idle();
    expect(h.offline.getStatus().failed.map((f) => f.label)).toEqual(["Add animal CLASH", "Record a weight of 100 kg"]);
    expect(h.server.db.weights).toHaveLength(0);
  });

  it("treats deleting something already gone as done", async () => {
    const h = await signedIn();
    const cow = (await h.api.post("/cattle", { tag: "A1", breed: "Nguni" })).data;
    h.goOffline();
    await h.api.delete(`/cattle/${cow.id}`);
    h.server.db.cattle.length = 0; // deleted elsewhere in the meantime

    h.goOnline();
    await h.idle();
    expect(h.offline.getStatus().failed).toHaveLength(0);
  });

  it("stops and keeps the queue when the session has expired", async () => {
    const h = await signedIn();
    h.goOffline();
    await h.api.post("/daily-counts", { count: 4, date: today });
    h.server.down = false;
    h.server.rejectWith = 401;
    h.state.online = true;
    h.offline.handleOnline();

    await vi.waitFor(() => expect(h.events).toContain(SESSION_EXPIRED_EVENT));
    expect(h.offline.getStatus().pending).toBe(1);
    expect(h.server.db.dailyCounts).toHaveLength(0);
  });

  it("retries on its own when the server can't be reached although the device is online", async () => {
    const h = await signedIn();
    h.server.down = true; // device thinks it is online, server is unreachable
    await h.api.post("/daily-counts", { count: 8, date: today }); // times out -> queued
    expect(h.offline.getStatus()).toMatchObject({ online: false, pending: 1 });

    h.server.down = false;
    await h.idle(); // the retry timer (5 ms here) uploads it without any browser event
    expect(h.server.db.dailyCounts.map((c) => c.count)).toEqual([8]);
    expect(h.offline.getStatus().online).toBe(true);
  });

  it("answers reads from the device while changes are waiting, even if the server is reachable", async () => {
    const h = await signedIn();
    h.goOffline();
    await h.api.post("/daily-counts", { count: 12, date: today });
    h.state.online = true;
    h.server.down = false;
    h.server.rejectWith = 503; // the upload will stall, leaving the change queued
    h.offline.handleOnline();

    await vi.waitFor(() => expect(h.server.calls.some((c) => c.method === "post")).toBe(true));
    expect((await h.api.get("/daily-counts")).data[0].count).toBe(12);
  });
});

describe("sign-in and sign-out", () => {
  it("restores the session and farm from the device when opened with no signal", async () => {
    const storage = createStorage();
    const first = await signedIn({ storage });
    await first.api.post("/cattle", { tag: "KEEP", breed: "Nguni" });

    const second = harness({ storage }); // a fresh page load
    second.goOffline();
    const me = await second.api.get("/auth/me");
    expect(me.data.user).toEqual(USER);
    expect((await second.api.get("/cattle")).data.map((c) => c.tag)).toEqual(["KEEP"]);
  });

  it("wipes the local copy on sign-out but keeps changes that haven't uploaded", async () => {
    const storage = createStorage();
    const h = await signedIn({ storage });
    h.goOffline();
    await h.api.post("/daily-counts", { count: 21, date: today });

    await h.offline.signOut();
    expect(h.offline.getStatus()).toMatchObject({ pending: 0, hasCopy: false });
    await expect(h.api.get("/auth/me")).rejects.toMatchObject({ code: "ERR_NETWORK" });

    // Signing back in as the same person brings the waiting change back and uploads it.
    const again = harness({ storage, server: h.server });
    again.goOnline();
    await again.offline.setUser(USER);
    await vi.waitFor(() => expect(h.server.db.dailyCounts.map((c) => c.count)).toEqual([21]));
  });

  it("never mixes up two people on the same device", async () => {
    const storage = createStorage();
    const h = await signedIn({ storage });
    h.goOffline();
    await h.api.post("/cattle", { tag: "MINE", breed: "Nguni" });
    await h.offline.signOut();

    const otherServer = fakeServer();
    const other = harness({ storage, server: otherServer });
    await other.offline.setUser({ id: 2, username: "someone-else" });
    await vi.waitFor(() => expect(other.offline.getStatus().hasCopy).toBe(true));
    expect((await other.api.get("/cattle")).data).toEqual([]);
    expect(other.offline.getStatus().pending).toBe(0);
    expect(otherServer.db.cattle).toEqual([]);
  });
});
