import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logoutUser } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logoutUser();
    navigate("/login");
  };

  return (
    <nav style={styles.nav}>
      <div style={styles.brand}>🚨 Emergency Response Platform</div>
      <div style={styles.links}>
        <Link to="/dashboard" style={styles.link}>
          Dashboard
        </Link>
        <Link to="/incidents" style={styles.link}>
          Incidents
        </Link>
        <Link to="/dispatch" style={styles.link}>
          Dispatch
        </Link>
        <Link to="/tracking" style={styles.link}>
          Tracking
        </Link>
        <Link to="/analytics" style={styles.link}>
          Analytics
        </Link>
        {user?.role === "system_admin" && (
          <Link to="/register" style={styles.link}>
            Register User
          </Link>
        )}
      </div>
      <div style={styles.user}>
        <span style={styles.userInfo}>
          {user?.name} ({user?.role?.replace("_", " ")})
        </span>
        <button onClick={handleLogout} style={styles.logoutBtn}>
          Logout
        </button>
      </div>
    </nav>
  );
}

const styles = {
  nav: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#1a3a5c",
    padding: "0 24px",
    height: "60px",
    color: "white",
  },
  brand: { fontSize: "18px", fontWeight: "bold", color: "white" },
  links: { display: "flex", gap: "20px" },
  link: {
    color: "#93c5fd",
    textDecoration: "none",
    fontSize: "14px",
    fontWeight: "500",
  },
  user: { display: "flex", alignItems: "center", gap: "12px" },
  userInfo: { fontSize: "13px", color: "#cbd5e1" },
  logoutBtn: {
    backgroundColor: "#ef4444",
    color: "white",
    border: "none",
    padding: "6px 14px",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "13px",
  },
};
