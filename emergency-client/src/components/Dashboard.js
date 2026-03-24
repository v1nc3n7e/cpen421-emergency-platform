import React, { useEffect, useState } from "react";
import { getOpenIncidents, getResponders, getVehicles } from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const { user } = useAuth();
  const [incidents, setIncidents] = useState([]);
  const [responders, setResponders] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getOpenIncidents(), getResponders(), getVehicles()])
      .then(([inc, resp, veh]) => {
        setIncidents(inc.data.data);
        setResponders(resp.data.data);
        setVehicles(veh.data.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const statusColor = {
    created: "#f59e0b",
    dispatched: "#3b82f6",
    in_progress: "#8b5cf6",
    resolved: "#10b981",
  };

  if (loading) return <div style={styles.loading}>Loading dashboard...</div>;

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Welcome, {user?.name}</h2>
      <p style={styles.subtitle}>Role: {user?.role?.replace(/_/g, " ")}</p>

      <div style={styles.statsGrid}>
        <div style={{ ...styles.statCard, borderTop: "4px solid #ef4444" }}>
          <div style={styles.statNum}>{incidents.length}</div>
          <div style={styles.statLabel}>Open Incidents</div>
        </div>
        <div style={{ ...styles.statCard, borderTop: "4px solid #3b82f6" }}>
          <div style={styles.statNum}>
            {incidents.filter((i) => i.status === "dispatched").length}
          </div>
          <div style={styles.statLabel}>Dispatched</div>
        </div>
        <div style={{ ...styles.statCard, borderTop: "4px solid #10b981" }}>
          <div style={styles.statNum}>
            {responders.filter((r) => r.isAvailable).length}
          </div>
          <div style={styles.statLabel}>Available Responders</div>
        </div>
        <div style={{ ...styles.statCard, borderTop: "4px solid #8b5cf6" }}>
          <div style={styles.statNum}>{vehicles.length}</div>
          <div style={styles.statLabel}>Registered Vehicles</div>
        </div>
      </div>

      <h3 style={styles.sectionTitle}>Recent Open Incidents</h3>
      {incidents.length === 0 ? (
        <p style={styles.empty}>No open incidents at the moment.</p>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr style={styles.thead}>
              <th style={styles.th}>Citizen</th>
              <th style={styles.th}>Type</th>
              <th style={styles.th}>Assigned Unit</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Time</th>
            </tr>
          </thead>
          <tbody>
            {incidents.slice(0, 10).map((inc, i) => (
              <tr
                key={inc.incidentId}
                style={{ backgroundColor: i % 2 === 0 ? "white" : "#f9fafb" }}
              >
                <td style={styles.td}>{inc.citizenName}</td>
                <td style={styles.td}>{inc.incidentType.replace("_", " ")}</td>
                <td style={styles.td}>{inc.assignedUnit || "Unassigned"}</td>
                <td style={styles.td}>
                  <span
                    style={{
                      ...styles.badge,
                      backgroundColor: statusColor[inc.status] + "20",
                      color: statusColor[inc.status],
                    }}
                  >
                    {inc.status.replace("_", " ")}
                  </span>
                </td>
                <td style={styles.td}>
                  {new Date(inc.createdAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const styles = {
  container: { padding: "24px", maxWidth: "1200px", margin: "0 auto" },
  title: {
    fontSize: "24px",
    fontWeight: "bold",
    color: "#1a3a5c",
    margin: "0 0 4px",
  },
  subtitle: {
    fontSize: "14px",
    color: "#6b7280",
    margin: "0 0 24px",
    textTransform: "capitalize",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "16px",
    marginBottom: "32px",
  },
  statCard: {
    backgroundColor: "white",
    borderRadius: "10px",
    padding: "20px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
  },
  statNum: { fontSize: "36px", fontWeight: "bold", color: "#1a3a5c" },
  statLabel: { fontSize: "13px", color: "#6b7280", marginTop: "4px" },
  sectionTitle: {
    fontSize: "18px",
    fontWeight: "600",
    color: "#1a3a5c",
    marginBottom: "12px",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    backgroundColor: "white",
    borderRadius: "10px",
    overflow: "hidden",
    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
  },
  thead: { backgroundColor: "#1a3a5c" },
  th: {
    padding: "12px 16px",
    textAlign: "left",
    fontSize: "13px",
    color: "white",
    fontWeight: "600",
  },
  td: {
    padding: "12px 16px",
    fontSize: "13px",
    color: "#374151",
    borderBottom: "1px solid #f3f4f6",
  },
  badge: {
    padding: "3px 10px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "500",
  },
  loading: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "200px",
    fontSize: "16px",
    color: "#6b7280",
  },
  empty: { color: "#6b7280", fontSize: "14px" },
};
