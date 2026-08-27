import { BrowserRouter, Routes, Route } from "react-router-dom";

import ProtectedRoute from "./components/ProtectedRoute";
import AppShell from "./components/AppShell";

import Welcome from "./pages/Welcome";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Register from "./pages/Register";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import DailyCounts from "./pages/DailyCounts";
import HerdStatus from "./pages/HerdStatus";
import Movements from "./pages/Movements";
import CattleProfile from "./pages/CattleProfile";
import Vaccinations from "./pages/Vaccinations";

function Protected({ children }) {
  return (
    <ProtectedRoute>
      <AppShell>{children}</AppShell>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/login" element={<Login />} />

        <Route
          path="/dashboard"
          element={
            <Protected>
              <Dashboard />
            </Protected>
          }
        />
        <Route
          path="/register"
          element={
            <Protected>
              <Register />
            </Protected>
          }
        />
        <Route
          path="/cattle/:id"
          element={
            <Protected>
              <CattleProfile />
            </Protected>
          }
        />
        <Route
          path="/daily-counts"
          element={
            <Protected>
              <DailyCounts />
            </Protected>
          }
        />
        <Route
          path="/vaccinations"
          element={
            <Protected>
              <Vaccinations />
            </Protected>
          }
        />
        <Route
          path="/reports"
          element={
            <Protected>
              <Reports />
            </Protected>
          }
        />
        <Route
          path="/herd"
          element={
            <Protected>
              <HerdStatus />
            </Protected>
          }
        />
        <Route
          path="/movements"
          element={
            <Protected>
              <Movements />
            </Protected>
          }
        />
        <Route
          path="/settings"
          element={
            <Protected>
              <Settings />
            </Protected>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
