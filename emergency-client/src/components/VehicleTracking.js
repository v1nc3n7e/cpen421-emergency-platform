import React, { useEffect, useState, useRef } from "react";
import {
  GoogleMap,
  useJsApiLoader,
  Marker,
  InfoWindow,
  Polyline,
} from "@react-google-maps/api";
import { io } from "socket.io-client";
import {
  getVehicles,
  getOpenIncidents,
  registerVehicle,
} from "../services/api";
import { useAuth } from "../context/AuthContext";
import axios from "axios";

const mapContainerStyle = {
  width: "100%",
  height: "540px",
  borderRadius: "10px",
};
const center = { lat: 5.6037, lng: -0.187 };
const vehicleEmoji = { ambulance: "🚑", police: "🚔", fire: "🚒" };
const statusColor = {
  available: "#22c55e",
  dispatched: "#ef4444",
  returning: "#f59e0b",
};

export default function VehicleTracking() {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [selected, setSelected] = useState(null);
  const [connected, setConnected] = useState(false);
  const [paths, setPaths] = useState({});
  const [simulating, setSimulating] = useState({});
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [newVehicle, setNewVehicle] = useState({
    vehicleId: "",
    type: "ambulance",
    stationId: "",
    driverName: "",
  });
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerError, setRegisterError] = useState("");
  const [registerSuccess, setRegisterSuccess] = useState("");
  const socketRef = useRef(null);
  const simIntervals = useRef({});

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_KEY,
  });

  useEffect(() => {
    Promise.all([getVehicles(), getOpenIncidents()])
      .then(([v, i]) => {
        setVehicles(v.data.data);
        setIncidents(i.data.data);
      })
      .catch(console.error);

    socketRef.current = io(process.env.REACT_APP_DISPATCH_SERVICE);
    socketRef.current.on("connect", () => {
      setConnected(true);
      socketRef.current.emit("join_admin");
    });
    socketRef.current.on("disconnect", () => setConnected(false));

    socketRef.current.on("vehicle_moved", (data) => {
      setVehicles((prev) =>
        prev.map((v) =>
          v.vehicleId === data.vehicleId
            ? {
                ...v,
                latitude: data.latitude,
                longitude: data.longitude,
                status: data.status,
                lastUpdated: data.lastUpdated,
              }
            : v,
        ),
      );
      setPaths((prev) => ({
        ...prev,
        [data.vehicleId]: [
          ...(prev[data.vehicleId] || []),
          { lat: data.latitude, lng: data.longitude },
        ],
      }));
    });

    socketRef.current.on("vehicle_dispatched", (data) => {
      setVehicles((prev) =>
        prev.map((v) =>
          v.vehicleId === data.vehicleId
            ? { ...v, status: "dispatched", incidentServiceId: data.incidentId }
            : v,
        ),
      );
    });

    return () => {
      socketRef.current?.disconnect();
      Object.values(simIntervals.current).forEach(clearInterval);
    };
  }, []);

  const handleRegisterVehicle = async () => {
    if (
      !newVehicle.vehicleId ||
      !newVehicle.stationId ||
      !newVehicle.driverName
    ) {
      setRegisterError("Please fill in all fields.");
      return;
    }
    setRegisterLoading(true);
    setRegisterError("");
    setRegisterSuccess("");
    try {
      await registerVehicle(newVehicle);
      setRegisterSuccess(
        `Vehicle ${newVehicle.vehicleId} registered successfully!`,
      );
      setNewVehicle({
        vehicleId: "",
        type: "ambulance",
        stationId: "",
        driverName: "",
      });
      const v = await getVehicles();
      setVehicles(v.data.data);
      setTimeout(() => {
        setShowRegisterForm(false);
        setRegisterSuccess("");
      }, 2000);
    } catch (err) {
      setRegisterError(
        err.response?.data?.message || "Failed to register vehicle.",
      );
    } finally {
      setRegisterLoading(false);
    }
  };

  const simulateMovement = (vehicleId, startLat, startLng) => {
    if (simulating[vehicleId]) {
      clearInterval(simIntervals.current[vehicleId]);
      setSimulating((prev) => ({ ...prev, [vehicleId]: false }));
      return;
    }
    setSimulating((prev) => ({ ...prev, [vehicleId]: true }));
    let lat = startLat || 5.6037;
    let lng = startLng || -0.187;
    simIntervals.current[vehicleId] = setInterval(async () => {
      lat += (Math.random() - 0.5) * 0.002;
      lng += (Math.random() - 0.5) * 0.002;
      try {
        const token = localStorage.getItem("accessToken");
        await axios.put(
          `${process.env.REACT_APP_DISPATCH_SERVICE}/vehicles/${vehicleId}/location`,
          { latitude: lat, longitude: lng },
          { headers: { Authorization: `Bearer ${token}` } },
        );
      } catch (err) {
        console.error("Simulation error:", err);
      }
    }, 3000);
  };

  const assignVehicle = async (vehicleId, incidentId) => {
    try {
      const token = localStorage.getItem("accessToken");
      await axios.post(
        `${process.env.REACT_APP_DISPATCH_SERVICE}/vehicles/assign`,
        { vehicleId, incidentId },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const v = await getVehicles();
      setVehicles(v.data.data);
      alert(`Vehicle ${vehicleId} assigned to incident successfully.`);
    } catch (err) {
      alert("Failed to assign vehicle.");
    }
  };

  const vehiclesWithLocation = vehicles.filter(
    (v) => v.latitude && v.longitude,
  );

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Vehicle Tracking</h1>
          <p style={s.subtitle}>Real-time GPS tracking via WebSocket</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {user?.role === "system_admin" && (
            <button
              style={s.registerBtn}
              onClick={() => {
                setShowRegisterForm(!showRegisterForm);
                setRegisterError("");
                setRegisterSuccess("");
              }}
            >
              {showRegisterForm ? "✕ Cancel" : "+ Register Vehicle"}
            </button>
          )}
          <span
            style={{
              ...s.connBadge,
              backgroundColor: connected ? "#f0fdf4" : "#fef2f2",
              color: connected ? "#16a34a" : "#dc2626",
              border: `1px solid ${connected ? "#bbf7d0" : "#fecaca"}`,
            }}
          >
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: connected ? "#22c55e" : "#ef4444",
                display: "inline-block",
                marginRight: "6px",
              }}
            />
            {connected ? "Live" : "Disconnected"}
          </span>
        </div>
      </div>

      {showRegisterForm && (
        <div style={s.formCard}>
          <h3 style={s.formTitle}>Register New Vehicle</h3>
          <div style={s.formGrid}>
            <div style={s.formField}>
              <label style={s.formLabel}>Vehicle ID</label>
              <input
                style={s.formInput}
                value={newVehicle.vehicleId}
                onChange={(e) =>
                  setNewVehicle({ ...newVehicle, vehicleId: e.target.value })
                }
                placeholder="e.g. AMB-002"
              />
            </div>
            <div style={s.formField}>
              <label style={s.formLabel}>Type</label>
              <select
                style={s.formInput}
                value={newVehicle.type}
                onChange={(e) =>
                  setNewVehicle({ ...newVehicle, type: e.target.value })
                }
              >
                <option value="ambulance">🚑 Ambulance</option>
                <option value="police">🚔 Police</option>
                <option value="fire">🚒 Fire Truck</option>
              </select>
            </div>
            <div style={s.formField}>
              <label style={s.formLabel}>Station / Hospital ID</label>
              <input
                style={s.formInput}
                value={newVehicle.stationId}
                onChange={(e) =>
                  setNewVehicle({ ...newVehicle, stationId: e.target.value })
                }
                placeholder="e.g. korle-bu-hospital"
              />
            </div>
            <div style={s.formField}>
              <label style={s.formLabel}>Driver Name</label>
              <input
                style={s.formInput}
                value={newVehicle.driverName}
                onChange={(e) =>
                  setNewVehicle({ ...newVehicle, driverName: e.target.value })
                }
                placeholder="e.g. Kwame Asante"
              />
            </div>
          </div>
          {registerError && <p style={s.formError}>{registerError}</p>}
          {registerSuccess && <p style={s.formSuccess}>{registerSuccess}</p>}
          <div style={s.formActions}>
            <button
              style={s.cancelBtn}
              onClick={() => setShowRegisterForm(false)}
            >
              Cancel
            </button>
            <button
              style={s.submitBtn}
              onClick={handleRegisterVehicle}
              disabled={registerLoading}
            >
              {registerLoading ? "Registering..." : "Register Vehicle"}
            </button>
          </div>
        </div>
      )}

      <div style={s.layout}>
        <div style={s.mapSide}>
          {isLoaded ? (
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={center}
              zoom={12}
            >
              {vehiclesWithLocation.map((v) => (
                <Marker
                  key={v.vehicleId}
                  position={{ lat: v.latitude, lng: v.longitude }}
                  onClick={() => setSelected(v)}
                  label={{
                    text: vehicleEmoji[v.type] || "🚗",
                    fontSize: "22px",
                    color: "transparent",
                  }}
                />
              ))}
              {Object.entries(paths).map(
                ([vid, path]) =>
                  path.length > 1 && (
                    <Polyline
                      key={vid}
                      path={path}
                      options={{
                        strokeColor: "#3b82f6",
                        strokeWeight: 2,
                        strokeOpacity: 0.6,
                      }}
                    />
                  ),
              )}
              {selected && selected.latitude && (
                <InfoWindow
                  position={{ lat: selected.latitude, lng: selected.longitude }}
                  onCloseClick={() => setSelected(null)}
                >
                  <div style={s.infoWin}>
                    <strong>
                      {vehicleEmoji[selected.type]} {selected.vehicleId}
                    </strong>
                    <p>Driver: {selected.driverName || "N/A"}</p>
                    <p>
                      Status:{" "}
                      <span
                        style={{
                          color: statusColor[selected.status],
                          fontWeight: 600,
                        }}
                      >
                        {selected.status}
                      </span>
                    </p>
                    <p>
                      Incident:{" "}
                      {selected.incidentServiceId
                        ? selected.incidentServiceId.slice(0, 8) + "..."
                        : "None"}
                    </p>
                    <p style={{ fontSize: "11px", color: "#94a3b8" }}>
                      {selected.lastUpdated
                        ? new Date(selected.lastUpdated).toLocaleTimeString()
                        : "No update yet"}
                    </p>
                  </div>
                </InfoWindow>
              )}
            </GoogleMap>
          ) : (
            <div style={s.mapLoad}>Loading map...</div>
          )}
        </div>

        <div style={s.sidebar}>
          <h3 style={s.sideTitle}>Fleet ({vehicles.length} vehicles)</h3>
          <div style={s.vehicleList}>
            {vehicles.map((v) => (
              <div
                key={v.vehicleId}
                style={{
                  ...s.vCard,
                  borderLeft: `3px solid ${statusColor[v.status] || "#e2e8f0"}`,
                }}
              >
                <div style={s.vHeader}>
                  <span style={s.vId}>
                    {vehicleEmoji[v.type]} {v.vehicleId}
                  </span>
                  <span
                    style={{
                      ...s.vStatus,
                      backgroundColor: statusColor[v.status] + "20",
                      color: statusColor[v.status],
                    }}
                  >
                    {v.status}
                  </span>
                </div>
                <p style={s.vInfo}>Driver: {v.driverName || "N/A"}</p>
                <p style={s.vInfo}>
                  {v.latitude
                    ? `📍 ${v.latitude.toFixed(4)}, ${v.longitude.toFixed(4)}`
                    : "📍 No location yet"}
                </p>
                {v.incidentServiceId && (
                  <p style={{ ...s.vInfo, color: "#ef4444" }}>
                    🚨 Incident: {v.incidentServiceId.slice(0, 8)}...
                  </p>
                )}
                <div style={s.vActions}>
                  <button
                    style={{
                      ...s.simBtn,
                      backgroundColor: simulating[v.vehicleId]
                        ? "#fef2f2"
                        : "#f0fdf4",
                      color: simulating[v.vehicleId] ? "#dc2626" : "#16a34a",
                      border: `1px solid ${simulating[v.vehicleId] ? "#fecaca" : "#bbf7d0"}`,
                    }}
                    onClick={() =>
                      simulateMovement(v.vehicleId, v.latitude, v.longitude)
                    }
                  >
                    {simulating[v.vehicleId] ? "⏹ Stop GPS" : "▶ Simulate GPS"}
                  </button>
                </div>
                {incidents.length > 0 && v.status === "available" && (
                  <div style={s.assignWrap}>
                    <select
                      style={s.assignSelect}
                      defaultValue=""
                      onChange={(e) =>
                        e.target.value &&
                        assignVehicle(v.vehicleId, e.target.value)
                      }
                    >
                      <option value="">Assign to incident...</option>
                      {incidents.map((inc) => (
                        <option key={inc.incidentId} value={inc.incidentId}>
                          {inc.incidentType} — {inc.citizenName}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            ))}
            {vehicles.length === 0 && (
              <p style={s.empty}>No vehicles registered yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const s = {
  page: { padding: "28px", maxWidth: "1400px", margin: "0 auto" },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
  },
  title: {
    fontSize: "26px",
    fontWeight: "700",
    color: "#0f172a",
    margin: "0 0 4px",
    letterSpacing: "-0.5px",
  },
  subtitle: { fontSize: "13px", color: "#64748b", margin: 0 },
  connBadge: {
    display: "flex",
    alignItems: "center",
    padding: "6px 14px",
    borderRadius: "20px",
    fontSize: "13px",
    fontWeight: "600",
  },
  registerBtn: {
    padding: "8px 16px",
    backgroundColor: "#0f172a",
    color: "#f8fafc",
    border: "none",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
  },
  formCard: {
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    border: "1px solid #e2e8f0",
    padding: "20px",
    marginBottom: "20px",
  },
  formTitle: {
    fontSize: "15px",
    fontWeight: "600",
    color: "#0f172a",
    margin: "0 0 16px",
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "14px",
    marginBottom: "16px",
  },
  formField: { display: "flex", flexDirection: "column", gap: "5px" },
  formLabel: { fontSize: "12px", fontWeight: "600", color: "#374151" },
  formInput: {
    padding: "9px 12px",
    borderRadius: "7px",
    border: "1px solid #e2e8f0",
    fontSize: "13px",
    color: "#0f172a",
    outline: "none",
  },
  formActions: { display: "flex", justifyContent: "flex-end", gap: "10px" },
  cancelBtn: {
    padding: "8px 16px",
    backgroundColor: "#f1f5f9",
    color: "#374151",
    border: "none",
    borderRadius: "7px",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
  },
  submitBtn: {
    padding: "8px 20px",
    backgroundColor: "#0f172a",
    color: "#f8fafc",
    border: "none",
    borderRadius: "7px",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
  },
  formError: { color: "#dc2626", fontSize: "13px", margin: "0 0 12px" },
  formSuccess: { color: "#16a34a", fontSize: "13px", margin: "0 0 12px" },
  layout: { display: "grid", gridTemplateColumns: "1fr 320px", gap: "20px" },
  mapSide: {},
  mapLoad: {
    height: "540px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
    borderRadius: "10px",
    color: "#94a3b8",
  },
  sidebar: { display: "flex", flexDirection: "column", gap: "12px" },
  sideTitle: {
    fontSize: "15px",
    fontWeight: "600",
    color: "#0f172a",
    margin: 0,
  },
  vehicleList: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    overflowY: "auto",
    maxHeight: "540px",
  },
  vCard: {
    backgroundColor: "#ffffff",
    borderRadius: "10px",
    padding: "14px",
    border: "1px solid #e2e8f0",
  },
  vHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "8px",
  },
  vId: { fontSize: "13px", fontWeight: "600", color: "#0f172a" },
  vStatus: {
    fontSize: "11px",
    padding: "2px 8px",
    borderRadius: "10px",
    fontWeight: "600",
  },
  vInfo: { fontSize: "12px", color: "#64748b", margin: "2px 0" },
  vActions: { marginTop: "10px" },
  simBtn: {
    width: "100%",
    padding: "7px",
    borderRadius: "7px",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
  },
  assignWrap: { marginTop: "8px" },
  assignSelect: {
    width: "100%",
    padding: "7px 10px",
    borderRadius: "7px",
    border: "1px solid #e2e8f0",
    fontSize: "12px",
    color: "#374151",
    backgroundColor: "#f8fafc",
  },
  infoWin: { fontSize: "13px", lineHeight: "1.7", minWidth: "160px" },
  empty: {
    color: "#94a3b8",
    fontSize: "13px",
    textAlign: "center",
    padding: "20px",
  },
};
