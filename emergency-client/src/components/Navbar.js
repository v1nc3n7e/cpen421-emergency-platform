import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const navItems = [
  {
    path: "/dashboard",
    label: "Dashboard",
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    path: "/incidents",
    label: "New Incident",
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M12 5v14M5 12h14" />
      </svg>
    ),
    role: "system_admin",
  },
  {
    path: "/dispatch",
    label: "Dispatch",
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4l3 3" />
      </svg>
    ),
  },
  {
    path: "/tracking",
    label: "Tracking",
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    ),
  },
  {
    path: "/analytics",
    label: "Analytics",
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    path: "/register",
    label: "Add User",
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="8.5" cy="7" r="4" />
        <line x1="20" y1="8" x2="20" y2="14" />
        <line x1="23" y1="11" x2="17" y2="11" />
      </svg>
    ),
    role: "system_admin",
  },
];

const roleColors = {
  system_admin: { bg: "#fef2f2", color: "#dc2626" },
  hospital_admin: { bg: "#eff6ff", color: "#2563eb" },
  police_admin: { bg: "#f0fdf4", color: "#16a34a" },
  fire_service_admin: { bg: "#fff7ed", color: "#ea580c" },
};

export default function Navbar() {
  const { user, logoutUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logoutUser();
    navigate("/login");
  };

  const visibleItems = navItems.filter(
    (item) => !item.role || item.role === user?.role,
  );
  const rc = roleColors[user?.role] || { bg: "#f1f5f9", color: "#475569" };

  return (
    <nav style={s.nav}>
      <div style={s.inner}>
        <div style={s.brand}>
          <div style={s.logo}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2L3 7v10l9 5 9-5V7L12 2z"
                stroke="#ef4444"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span style={s.brandName}>EmergencyGH</span>
        </div>

        <div style={s.links}>
          {visibleItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{ ...s.link, ...(active ? s.linkActive : {}) }}
              >
                <span style={{ color: active ? "#ef4444" : "#64748b" }}>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </div>

        <div style={s.right}>
          <div style={s.userInfo}>
            <div style={s.avatar}>{user?.name?.charAt(0).toUpperCase()}</div>
            <div style={s.userText}>
              <span style={s.userName}>{user?.name}</span>
              <span
                style={{
                  ...s.roleBadge,
                  backgroundColor: rc.bg,
                  color: rc.color,
                }}
              >
                {user?.role?.replace(/_/g, " ")}
              </span>
            </div>
          </div>
          <button onClick={handleLogout} style={s.logoutBtn}>
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );
}

const s = {
  nav: {
    backgroundColor: "#ffffff",
    borderBottom: "1px solid #e2e8f0",
    position: "sticky",
    top: 0,
    zIndex: 100,
  },
  inner: {
    maxWidth: "1400px",
    margin: "0 auto",
    padding: "0 24px",
    height: "60px",
    display: "flex",
    alignItems: "center",
    gap: "32px",
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    textDecoration: "none",
    flexShrink: 0,
  },
  logo: {
    width: "32px",
    height: "32px",
    backgroundColor: "#0f172a",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  brandName: {
    fontSize: "15px",
    fontWeight: "700",
    color: "#0f172a",
    letterSpacing: "-0.3px",
  },
  links: { display: "flex", gap: "2px", flex: 1 },
  link: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "6px 12px",
    borderRadius: "7px",
    textDecoration: "none",
    fontSize: "13px",
    fontWeight: "500",
    color: "#475569",
    transition: "all 0.15s",
  },
  linkActive: { backgroundColor: "#f8fafc", color: "#0f172a" },
  right: { display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 },
  userInfo: { display: "flex", alignItems: "center", gap: "10px" },
  avatar: {
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    backgroundColor: "#0f172a",
    color: "#f8fafc",
    fontSize: "13px",
    fontWeight: "600",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  userText: { display: "flex", flexDirection: "column", gap: "2px" },
  userName: {
    fontSize: "13px",
    fontWeight: "500",
    color: "#0f172a",
    lineHeight: 1,
  },
  roleBadge: {
    fontSize: "10px",
    fontWeight: "500",
    padding: "2px 6px",
    borderRadius: "4px",
    textTransform: "capitalize",
    lineHeight: 1.4,
  },
  logoutBtn: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "7px 12px",
    backgroundColor: "transparent",
    border: "1px solid #e2e8f0",
    borderRadius: "7px",
    fontSize: "13px",
    color: "#64748b",
    cursor: "pointer",
    fontWeight: "500",
    transition: "all 0.15s",
  },
};
