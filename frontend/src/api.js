import axios from "axios";
import { createOffline } from "./offline/controller";
import { createStorage } from "./offline/storage";
import { DATA_CHANGED_EVENT, SESSION_EXPIRED_EVENT, SYNC_COMPLETE_EVENT } from "./offline/events";

export { DATA_CHANGED_EVENT, SESSION_EXPIRED_EVENT, SYNC_COMPLETE_EVENT };

// Same-origin by default: in dev the Vite proxy forwards /api to the backend,
// and on Vercel the API lives under /api on the same domain. That is what
// lets the session cookie be SameSite=Strict.
export const API_BASE = import.meta.env.VITE_API_URL || "/api";

const clientOptions = { baseURL: API_BASE, withCredentials: true, timeout: 20_000 };

export const api = axios.create(clientOptions);

// Offline support: reads fall back to a local copy of the farm, and writes made
// without signal are queued and uploaded later (see ./offline/controller.js).
// `raw` is a plain client the queue uses to upload, so it never re-enters itself.
export const offline = createOffline({
  api,
  raw: axios.create(clientOptions),
  storage: createStorage(),
  emit: (name) => window.dispatchEvent(new Event(name)),
});

if (typeof window !== "undefined") {
  window.addEventListener("online", offline.handleOnline);
  window.addEventListener("offline", offline.handleOffline);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") offline.sync();
  });
  // A signed-out session must not leave the farm's data readable from this device.
  window.addEventListener(SESSION_EXPIRED_EVENT, () => offline.signOut());
}

api.interceptors.response.use(
  (res) => {
    // Any successful write tells interested UI (e.g. the sidebar alert badge) to refresh.
    if (res.config.method && res.config.method !== "get") {
      window.dispatchEvent(new Event(DATA_CHANGED_EVENT));
    }
    return res;
  },
  (error) => {
    const url = error.config?.url ?? "";
    // A 401 on a data call means the session ended; auth calls handle their own 401s.
    if (error.response?.status === 401 && !url.startsWith("/auth/")) {
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }
    return Promise.reject(error);
  }
);

/** Turns any thrown API error into a sentence that is safe and useful to show. */
export function errorMessage(err, fallback = "Something went wrong. Please try again.") {
  if (err?.code === "ERR_NETWORK" || err?.code === "ECONNABORTED") {
    return "Can't reach the server. Check your connection and try again.";
  }
  return err?.response?.data?.error ?? fallback;
}
