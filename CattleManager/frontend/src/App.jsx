import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Flex, Box } from "@chakra-ui/react";

import ProtectedRoute from "./components/ProtectedRoute";
import Sidebar from "./components/sidebar_temp";

import Welcome from "./pages/Welcome";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Register from "./pages/Register";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import DailyCounts from "./pages/DailyCounts";
import HerdStatus from "./pages/HerdStatus";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/daily-counts" element={<DailyCounts />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/herd" element={<HerdStatus />} />
        <Route path="/settings" element={<Settings />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Flex minH="100vh">
                <Sidebar />
                <Box flex="2" p={6}>
                  <Dashboard />
                </Box>
              </Flex>
            </ProtectedRoute>
          }
        />

        <Route
          path="/register"
          element={
            <ProtectedRoute>
              <Register />
            </ProtectedRoute>
          }
        />

        <Route
          path="/daily-counts"
          element={
            <ProtectedRoute>
              <DailyCounts />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <Reports />
            </ProtectedRoute>
          }
        />

        
        <Route
          path="/herd"
          element={
            <ProtectedRoute>
              <HerdStatus />
            </ProtectedRoute>
          }
        />

        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
