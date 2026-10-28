import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api, offline, SESSION_EXPIRED_EVENT } from "../api";

const AuthContext = createContext(null);

const SIGNED_OUT = { status: "anon", user: null };

/**
 * Session state lives in an httpOnly cookie the browser manages, so there is
 * no token in JavaScript (or localStorage) for an attacker's script to steal.
 * The UI only learns *who* is signed in by asking the server (/auth/me).
 */
export function AuthProvider({ children }) {
  const [state, setState] = useState({ status: "loading", user: null });

  useEffect(() => {
    let alive = true;
    api
      .get("/auth/me")
      .then((res) => {
        if (!alive) return;
        setState(res.data.user ? { status: "authed", user: res.data.user } : SIGNED_OUT);
      })
      .catch(() => alive && setState(SIGNED_OUT));

    const onExpired = () => setState(SIGNED_OUT);
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => {
      alive = false;
      window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
    };
  }, []);

  const value = useMemo(() => {
    const authenticate = async (path, body) => {
      const res = await api.post(path, body);
      // Load this person's offline copy and queue (and upload anything still waiting).
      await offline.setUser(res.data.user);
      setState({ status: "authed", user: res.data.user });
      return res.data.user;
    };

    return {
      ...state,
      login: (username, password) => authenticate("/auth/login", { username, password }),
      signup: (username, password) => authenticate("/auth/signup", { username, password }),
      startDemo: () => authenticate("/auth/demo"),
      logout: async () => {
        try {
          await api.post("/auth/logout");
        } finally {
          // Takes the farm's data off this device (changes not yet uploaded are kept for next sign-in).
          offline.signOut();
          setState(SIGNED_OUT);
        }
      },
      // The account no longer exists, so nothing queued for it can ever be uploaded.
      clear: () => {
        offline.forget();
        setState(SIGNED_OUT);
      },
    };
  }, [state]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
