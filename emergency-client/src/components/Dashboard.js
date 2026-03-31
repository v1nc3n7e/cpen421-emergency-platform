import React, { useEffect, useState } from "react";
import { getOpenIncidents, getVehicles } from "../services/api";
import { useAuth } from "../context/AuthContext";

const statusConfig = {
  created: { color: "#f59e0b", bg: "#fffbeb", label: "Created" },
  dispatched: { color: "#3b82f6", bg: "#eff6ff", label: "Dispatched" },
  in_progress: { color: "#8b5cf6", bg: "#f5f3ff", label: "In Progress" },
  resolved: { color: "#22c55e", bg: "#f0fdf4", label: "Resolved" },
};

const typeIcons = {
  robbery: "🔫",
  crime: "⚠️",
  fire: "🔥",
  medical_emergency: "🏥",
  accident: "🚗",
  other: "📋",
};

function StatCard({ value, label, color, icon }) {
  return (
    <div style={s.statCard}>
      <div style={{ ...s.statIcon, backgroundColor: color + "15" }}>
        <span style={{ fontSize: "20px" }}>{icon}</span>
      </div>
      <div>
        <div style={s.statValue}>{value}</div>
        <div style={s.statLabel}>{label}</div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [incidents, setIncidents] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = () => {
    Promise.all([getOpenIncidents(), getVehicles()])
      .then(([inc, veh]) => {
        setIncidents(inc.data.data);
        setVehicles(veh.data.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading)
    return (
      <div style={s.loadingWrap}>
        <div style={s.loadingDot} />
        <span style={s.loadingText}>Loading dashboard...</span>
      </div>
    );

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Dashboard</h1>
          <p style={s.subtitle}>
            Welcome back, {user?.name} — here's what's happening
          </p>
        </div>
        <div style={s.time}>
          {new Date().toLocaleDateString("en-GH", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </div>
      </div>

      <div style={s.statsGrid}>
        <StatCard
          value={incidents.length}
          label="Open Incidents"
          color="#ef4444"
          icon="🚨"
        />
        <StatCard
          value={incidents.filter((i) => i.status === "dispatched").length}
          label="Dispatched"
          color="#3b82f6"
          icon="🚔"
        />
        <StatCard
          value={incidents.filter((i) => i.status === "in_progress").length}
          label="In Progress"
          color="#8b5cf6"
          icon="⚡"
        />
        <StatCard
          value={vehicles.length}
          label="Registered Vehicles"
          color="#0ea5e9"
          icon="🚑"
        />
      </div>

      <div style={s.section}>
        <div style={s.sectionHeader}>
          <h2 style={s.sectionTitle}>Active Incidents</h2>
          <span style={s.badge}>{incidents.length} open</span>
        </div>

        {incidents.length === 0 ? (
          <div style={s.empty}>
            <span style={{ fontSize: "40px" }}>✅</span>
            <p style={s.emptyText}>No active incidents at the moment</p>
          </div>
        ) : (
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead>
                <tr>
                  {[
                    "Type",
                    "Citizen",
                    "Assigned Unit",
                    "Status",
                    "Location",
                    "Time",
                  ].map((h) => (
                    <th key={h} style={s.th}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {incidents.slice(0, 12).map((inc, i) => {
                  const sc = statusConfig[inc.status] || statusConfig.created;
                  return (
                    <tr
                      key={inc.incidentId}
                      style={{
                        backgroundColor: i % 2 === 0 ? "#ffffff" : "#f8fafc",
                      }}
                    >
                      <td style={s.td}>
                        <span style={s.typeCell}>
                          <span style={{ fontSize: "16px" }}>
                            {typeIcons[inc.incidentType] || "📋"}
                          </span>
                          <span style={s.typeText}>
                            {inc.incidentType.replace(/_/g, " ")}
                          </span>
                        </span>
                      </td>
                      <td style={s.td}>{inc.citizenName}</td>
                      <td style={s.td}>
                        {inc.assignedUnit ? (
                          <span style={s.assignedUnit}>{inc.assignedUnit}</span>
                        ) : (
                          <span style={s.unassigned}>Unassigned</span>
                        )}
                      </td>
                      <td style={s.td}>
                        <span
                          style={{
                            ...s.statusBadge,
                            backgroundColor: sc.bg,
                            color: sc.color,
                          }}
                        >
                          {sc.label}
                        </span>
                      </td>
                      <td
                        style={{
                          ...s.td,
                          fontFamily: "monospace",
                          fontSize: "12px",
                          color: "#64748b",
                        }}
                      >
                        {inc.latitude?.toFixed(3)}, {inc.longitude?.toFixed(3)}
                      </td>
                      <td
                        style={{ ...s.td, color: "#94a3b8", fontSize: "12px" }}
                      >
                        {new Date(inc.createdAt).toLocaleTimeString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  page: { padding: "32px", maxWidth: "1400px", margin: "0 auto" },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "28px",
  },
  title: {
    fontSize: "26px",
    fontWeight: "700",
    color: "#0f172a",
    margin: "0 0 4px",
    letterSpacing: "-0.5px",
  },
  subtitle: { fontSize: "14px", color: "#64748b", margin: 0 },
  time: { fontSize: "13px", color: "#94a3b8", paddingTop: "6px" },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "12px",
    marginBottom: "28px",
  },
  statCard: {
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    padding: "16px",
    border: "1px solid #e2e8f0",
    display: "flex",
    alignItems: "center",
    gap: "14px",
  },
  statIcon: {
    width: "44px",
    height: "44px",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  statValue: {
    fontSize: "24px",
    fontWeight: "700",
    color: "#0f172a",
    lineHeight: 1,
    letterSpacing: "-0.5px",
  },
  statLabel: {
    fontSize: "11px",
    color: "#94a3b8",
    marginTop: "3px",
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: "0.4px",
  },
  section: {
    backgroundColor: "#ffffff",
    borderRadius: "14px",
    border: "1px solid #e2e8f0",
    overflow: "hidden",
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "18px 24px",
    borderBottom: "1px solid #f1f5f9",
  },
  sectionTitle: {
    fontSize: "15px",
    fontWeight: "600",
    color: "#0f172a",
    margin: 0,
  },
  badge: {
    backgroundColor: "#fef2f2",
    color: "#ef4444",
    fontSize: "12px",
    fontWeight: "600",
    padding: "3px 10px",
    borderRadius: "20px",
  },
  tableWrap: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: {
    padding: "12px 16px",
    textAlign: "left",
    fontSize: "11px",
    fontWeight: "600",
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    backgroundColor: "#f8fafc",
    borderBottom: "1px solid #e2e8f0",
  },
  td: {
    padding: "13px 16px",
    fontSize: "13px",
    color: "#374151",
    borderBottom: "1px solid #f1f5f9",
  },
  typeCell: { display: "flex", alignItems: "center", gap: "8px" },
  typeText: { fontWeight: "500", textTransform: "capitalize" },
  statusBadge: {
    padding: "3px 10px",
    borderRadius: "20px",
    fontSize: "11px",
    fontWeight: "600",
    whiteSpace: "nowrap",
  },
  assignedUnit: { fontSize: "13px", color: "#0f172a", fontWeight: "500" },
  unassigned: { fontSize: "12px", color: "#cbd5e1", fontStyle: "italic" },
  loadingWrap: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
    height: "300px",
  },
  loadingDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    backgroundColor: "#ef4444",
    animation: "pulse 1s ease infinite",
  },
  loadingText: { fontSize: "14px", color: "#94a3b8" },
  empty: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "12px",
    padding: "60px",
  },
  emptyText: { fontSize: "14px", color: "#94a3b8", margin: 0 },
};
