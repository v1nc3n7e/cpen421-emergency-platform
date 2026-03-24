import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import IncidentForm from "./components/IncidentForm";
import DispatchStatus from "./components/DispatchStatus";
import VehicleTracking from "./components/VehicleTracking";
import Analytics from "./components/Analytics";
import Register from "./components/Register";

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          fontSize: "16px",
          color: "#6b7280",
        }}
      >
        Loading...
      </div>
    );
  return user ? children : <Navigate to="/login" />;
}

function AppLayout() {
  const { user } = useAuth();
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={user ? <Navigate to="/dashboard" /> : <Login />}
        />
        <Route
          path="/*"
          element={
            <PrivateRoute>
              <div style={{ minHeight: "100vh", backgroundColor: "#f0f4f8" }}>
                <Navbar />
                <Routes>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/incidents" element={<IncidentForm />} />
                  <Route path="/dispatch" element={<DispatchStatus />} />
                  <Route path="/tracking" element={<VehicleTracking />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="*" element={<Navigate to="/dashboard" />} />
                </Routes>
              </div>
            </PrivateRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppLayout />
    </AuthProvider>
  );
}
