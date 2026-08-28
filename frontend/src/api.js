import axios from "axios";

export const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";
export const AUTH_STORAGE_KEY = "cattle_auth";

const PUBLIC_PATHS = ["/", "/login", "/signup"];

// Safely reads {token, user} from localStorage. Malformed/corrupted storage
// (a stale value from an older app version, a manual edit, a partial write)
// is treated as "not logged in" instead of throwing during app startup.
export function readStoredAuth() {
  const stored = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!stored) return null;

  try {
    return JSON.parse(stored);
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

export const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
  const token = readStoredAuth()?.token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && !PUBLIC_PATHS.includes(window.location.pathname)) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);
