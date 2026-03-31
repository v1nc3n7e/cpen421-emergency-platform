import React, { useEffect, useState } from "react";
import { getOpenIncidents, updateIncidentStatus } from "../services/api";

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

  const freeVehicle = async (incidentId) => {
    try {
      const token = localStorage.getItem("accessToken");
      // Get vehicles assigned to this incident
      const res = await fetch(
        `${process.env.REACT_APP_DISPATCH_SERVICE}/vehicles/incident/${incidentId}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const data = await res.json();
      if (data.success && data.data?.length > 0) {
        for (const vehicle of data.data) {
          await fetch(
            `${process.env.REACT_APP_DISPATCH_SERVICE}/vehicles/${vehicle.vehicleId}/status`,
            {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                status: "available",
                incidentServiceId: null,
              }),
            },
          );
        }
      }
    } catch (err) {
      console.error("Failed to free vehicle:", err);
    }
  };

  const handleStatusUpdate = async (id, status) => {
    setUpdating(id);
    try {
      await updateIncidentStatus(id, status);
      if (status === "resolved") {
        await freeVehicle(id);
      }
      fetchIncidents();
    } catch (err) {
      alert("Failed to update status.");
    } finally {
      setUpdating(null);
    }
  };

  if (loading) return <div style={s.loading}>Loading incidents...</div>;

  return (
    <div style={s.container}>
      <div style={s.header}>
        <div>
          <h2 style={s.title}>Dispatch Status</h2>
          <p style={s.subtitle}>Auto-refreshes every 15 seconds</p>
        </div>
        <span style={s.badge}>{incidents.length} Active</span>
      </div>

      {incidents.length === 0 ? (
        <div style={s.empty}>
          <div style={{ fontSize: "48px" }}>✅</div>
          <p>No active incidents at the moment.</p>
        </div>
      ) : (
        <div style={s.grid}>
          {incidents.map((inc) => {
            const sc = statusConfig[inc.status] || statusConfig.created;
            return (
              <div
                key={inc.incidentId}
                style={{ ...s.card, borderLeft: `4px solid ${sc.color}` }}
              >
                <div style={s.cardHeader}>
                  <span style={s.type}>
                    {typeIcons[inc.incidentType] || "📋"}{" "}
                    {inc.incidentType.replace(/_/g, " ").toUpperCase()}
                  </span>
                  <span
                    style={{
                      ...s.status,
                      backgroundColor: sc.bg,
                      color: sc.color,
                    }}
                  >
                    {sc.label}
                  </span>
                </div>
                <p style={s.citizen}>
                  <strong>Citizen:</strong> {inc.citizenName}
                </p>
                <p style={s.info}>
                  <strong>Assigned:</strong> {inc.assignedUnit || "Unassigned"}
                </p>
                <p style={s.info}>
                  <strong>Location:</strong> {inc.latitude?.toFixed(4)},{" "}
                  {inc.longitude?.toFixed(4)}
                </p>
                {inc.notes && <p style={s.notes}>{inc.notes}</p>}
                <p style={s.time}>{new Date(inc.createdAt).toLocaleString()}</p>
                <div style={s.actions}>
                  {inc.status !== "in_progress" &&
                    inc.status !== "resolved" && (
                      <button
                        style={{ ...s.actionBtn, backgroundColor: "#8b5cf6" }}
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
                      style={{ ...s.actionBtn, backgroundColor: "#22c55e" }}
                      onClick={() =>
                        handleStatusUpdate(inc.incidentId, "resolved")
                      }
                      disabled={updating === inc.incidentId}
                    >
                      {updating === inc.incidentId
                        ? "Resolving..."
                        : "✓ Mark Resolved"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const s = {
  container: { padding: "28px", maxWidth: "1200px", margin: "0 auto" },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "24px",
  },
  title: {
    fontSize: "26px",
    fontWeight: "700",
    color: "#0f172a",
    margin: "0 0 4px",
    letterSpacing: "-0.5px",
  },
  subtitle: { fontSize: "13px", color: "#9ca3af", margin: 0 },
  badge: {
    backgroundColor: "#fef2f2",
    color: "#ef4444",
    padding: "6px 14px",
    borderRadius: "20px",
    fontSize: "13px",
    fontWeight: "600",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
    gap: "16px",
  },
  card: {
    backgroundColor: "white",
    borderRadius: "12px",
    padding: "20px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
    border: "1px solid #e2e8f0",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "12px",
  },
  type: { fontSize: "13px", fontWeight: "700", color: "#0f172a" },
  status: {
    padding: "3px 10px",
    borderRadius: "20px",
    fontSize: "11px",
    fontWeight: "600",
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
