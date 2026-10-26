import { Suspense } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AppShell from "./AppShell";
import PageSpinner from "./ui/PageSpinner";

/**
 * Layout route for everything behind login. The shell is mounted once and
 * stays put while the page inside it changes (and lazy pages load).
 */
export default function ProtectedRoute() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === "loading") return <PageSpinner fullScreen />;
  if (status === "anon") {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return (
    <AppShell>
      <Suspense fallback={<PageSpinner />}>
        <Outlet />
      </Suspense>
    </AppShell>
  );
}

/** Keeps signed-in users out of the login / sign-up screens. */
export function PublicOnly({ children }) {
  const { status } = useAuth();
  if (status === "loading") return <PageSpinner fullScreen />;
  if (status === "authed") return <Navigate to="/dashboard" replace />;
  return children;
}
