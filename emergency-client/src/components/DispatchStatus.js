import React, { useEffect, useState } from "react";
import { getOpenIncidents, updateIncidentStatus } from "../services/api";

const statusColor = {
  created: "#f59e0b",
  dispatched: "#3b82f6",
  in_progress: "#8b5cf6",
  resolved: "#10b981",
};

export default function DispatchStatus() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);

  const fetchIncidents = () => {
    getOpenIncidents()
      .then((res) => setIncidents(res.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchIncidents();
    const interval = setInterval(fetchIncidents, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleStatusUpdate = async (id, status) => {
    setUpdating(id);
    try {
      await updateIncidentStatus(id, status);
      fetchIncidents();
    } catch (err) {
      alert("Failed to update status.");
    } finally {
      setUpdating(null);
    }
  };

  if (loading) return <div style={styles.loading}>Loading incidents...</div>;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Dispatch Status</h2>
        <span style={styles.badge}>{incidents.length} Active</span>
      </div>
      <p style={styles.subtitle}>Auto-refreshes every 15 seconds</p>

      {incidents.length === 0 ? (
        <div style={styles.empty}>
          <div style={{ fontSize: "48px" }}>✅</div>
          <p>No active incidents at the moment.</p>
        </div>
      ) : (
        <div style={styles.grid}>
          {incidents.map((inc) => (
            <div key={inc.incidentId} style={styles.card}>
              <div style={styles.cardHeader}>
                <span style={styles.type}>
                  {inc.incidentType.replace("_", " ").toUpperCase()}
                </span>
                <span
                  style={{
                    ...styles.status,
                    backgroundColor: statusColor[inc.status] + "20",
                    color: statusColor[inc.status],
                  }}
                >
                  {inc.status.replace("_", " ")}
                </span>
              </div>
              <p style={styles.citizen}>
                <strong>Citizen:</strong> {inc.citizenName}
              </p>
              <p style={styles.info}>
                <strong>Assigned:</strong> {inc.assignedUnit || "Unassigned"}
              </p>
              <p style={styles.info}>
                <strong>Location:</strong> {inc.latitude.toFixed(4)},{" "}
                {inc.longitude.toFixed(4)}
              </p>
              {inc.notes && <p style={styles.notes}>{inc.notes}</p>}
              <p style={styles.time}>
                {new Date(inc.createdAt).toLocaleString()}
              </p>
              <div style={styles.actions}>
                {inc.status !== "in_progress" && inc.status !== "resolved" && (
                  <button
                    style={{ ...styles.actionBtn, backgroundColor: "#8b5cf6" }}
                    onClick={() =>
                      handleStatusUpdate(inc.incidentId, "in_progress")
                    }
                    disabled={updating === inc.incidentId}
                  >
                    Mark In Progress
                  </button>
                )}
                {inc.status !== "resolved" && (
                  <button
                    style={{ ...styles.actionBtn, backgroundColor: "#10b981" }}
                    onClick={() =>
                      handleStatusUpdate(inc.incidentId, "resolved")
                    }
                    disabled={updating === inc.incidentId}
                  >
                    Mark Resolved
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { padding: "24px", maxWidth: "1200px", margin: "0 auto" },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "4px",
  },
  title: { fontSize: "24px", fontWeight: "bold", color: "#1a3a5c", margin: 0 },
  badge: {
    backgroundColor: "#fee2e2",
    color: "#dc2626",
    padding: "4px 12px",
    borderRadius: "20px",
    fontSize: "13px",
    fontWeight: "600",
  },
  subtitle: { fontSize: "13px", color: "#9ca3af", margin: "0 0 24px" },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
    gap: "16px",
  },
  card: {
    backgroundColor: "white",
    borderRadius: "10px",
    padding: "20px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
    borderLeft: "4px solid #3b82f6",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "12px",
  },
  type: { fontSize: "13px", fontWeight: "700", color: "#1a3a5c" },
  status: {
    padding: "3px 10px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "500",
  },
  citizen: { fontSize: "14px", color: "#374151", margin: "0 0 4px" },
  info: { fontSize: "13px", color: "#6b7280", margin: "0 0 4px" },
  notes: {
    fontSize: "13px",
    color: "#374151",
    backgroundColor: "#f9fafb",
    padding: "8px",
    borderRadius: "6px",
    margin: "8px 0",
  },
  time: { fontSize: "12px", color: "#9ca3af", margin: "8px 0" },
  actions: { display: "flex", gap: "8px", marginTop: "12px" },
  actionBtn: {
    color: "white",
    border: "none",
    padding: "7px 14px",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
  },
  loading: {
    display: "flex",
    justifyContent: "center",
    padding: "60px",
    color: "#6b7280",
  },
  empty: { textAlign: "center", padding: "60px", color: "#6b7280" },
};
