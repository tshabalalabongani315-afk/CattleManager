import axios from "axios";

// Same-origin by default: in dev the Vite proxy forwards /api to the backend,
// and on Vercel the API lives under /api on the same domain. That is what
// lets the session cookie be SameSite=Strict.
export const API_BASE = import.meta.env.VITE_API_URL || "/api";

export const SESSION_EXPIRED_EVENT = "auth:expired";
export const DATA_CHANGED_EVENT = "herd:changed";

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  timeout: 20_000,
});

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
