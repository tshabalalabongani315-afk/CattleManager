import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import ProtectedRoute, { PublicOnly } from "./components/ProtectedRoute";
import PageSpinner from "./components/ui/PageSpinner";

import Welcome from "./pages/Welcome";
import Login from "./pages/Login";
import Signup from "./pages/Signup";

// Pages behind login are split into their own chunks so the landing page
// (and heavy chart code) don't load until they're needed.
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Register = lazy(() => import("./pages/Register"));
const CattleProfile = lazy(() => import("./pages/CattleProfile"));
const DailyCounts = lazy(() => import("./pages/DailyCounts"));
const Movements = lazy(() => import("./pages/Movements"));
const Vaccinations = lazy(() => import("./pages/Vaccinations"));
const HerdStatus = lazy(() => import("./pages/HerdStatus"));
const Reports = lazy(() => import("./pages/Reports"));
const Settings = lazy(() => import("./pages/Settings"));

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageSpinner fullScreen />}>
        <Routes>
          <Route path="/" element={<Welcome />} />
          <Route
            path="/login"
            element={
              <PublicOnly>
                <Login />
              </PublicOnly>
            }
          />
          <Route
            path="/signup"
            element={
              <PublicOnly>
                <Signup />
              </PublicOnly>
            }
          />

          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/register" element={<Register />} />
            <Route path="/cattle/:id" element={<CattleProfile />} />
            <Route path="/daily-counts" element={<DailyCounts />} />
            <Route path="/movements" element={<Movements />} />
            <Route path="/vaccinations" element={<Vaccinations />} />
            <Route path="/herd" element={<HerdStatus />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Settings />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
