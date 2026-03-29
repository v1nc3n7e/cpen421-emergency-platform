import React, { useEffect } from "react";
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
          backgroundColor: "#f8fafc",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              border: "3px solid #e2e8f0",
              borderTop: "3px solid #0f172a",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
              margin: "0 auto 12px",
            }}
          />
          <p style={{ color: "#94a3b8", fontSize: "14px" }}>Loading...</p>
        </div>
      </div>
    );
  return user ? children : <Navigate to="/login" />;
}

function AppLayout() {
  const { user } = useAuth();

  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: 'DM Sans', -apple-system, sans-serif; background-color: #f8fafc; color: #0f172a; }
      @keyframes spin { to { transform: rotate(360deg); } }
      @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      @keyframes slideIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      input:focus, select:focus, textarea:focus { outline: none; border-color: #0f172a !important; box-shadow: 0 0 0 3px rgba(15,23,42,0.08); }
      a { text-decoration: none; }
      button:hover { opacity: 0.85; }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

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
              <div style={{ minHeight: "100vh", backgroundColor: "#f8fafc" }}>
                <Navbar />
                <main style={{ animation: "slideIn 0.2s ease" }}>
                  <Routes>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/incidents" element={<IncidentForm />} />
                    <Route path="/dispatch" element={<DispatchStatus />} />
                    <Route path="/tracking" element={<VehicleTracking />} />
                    <Route path="/analytics" element={<Analytics />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="*" element={<Navigate to="/dashboard" />} />
                  </Routes>
                </main>
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
