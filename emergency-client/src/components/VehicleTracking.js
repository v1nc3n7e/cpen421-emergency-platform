import React, { useEffect, useState, useRef } from "react";
import {
  GoogleMap,
  useJsApiLoader,
  Marker,
  InfoWindow,
} from "@react-google-maps/api";
import { io } from "socket.io-client";
import { getVehicles } from "../services/api";

const mapContainerStyle = {
  width: "100%",
  height: "500px",
  borderRadius: "8px",
};
const center = { lat: 5.6037, lng: -0.187 };

const vehicleIcon = { ambulance: "🚑", police: "🚔", fire: "🚒" };
const statusColor = {
  available: "#10b981",
  dispatched: "#ef4444",
  returning: "#f59e0b",
};

export default function VehicleTracking() {
  const [vehicles, setVehicles] = useState([]);
  const [selected, setSelected] = useState(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_KEY,
  });

  useEffect(() => {
    getVehicles()
      .then((res) => setVehicles(res.data.data))
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
    });

    return () => socketRef.current?.disconnect();
  }, []);

  const vehiclesWithLocation = vehicles.filter(
    (v) => v.latitude && v.longitude,
  );

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Vehicle Tracking</h2>
        <span
          style={{
            ...styles.connBadge,
            backgroundColor: connected ? "#dcfce7" : "#fee2e2",
            color: connected ? "#16a34a" : "#dc2626",
          }}
        >
          {connected ? "🟢 Live" : "🔴 Disconnected"}
        </span>
      </div>
      <p style={styles.subtitle}>Real-time vehicle locations via WebSocket</p>

      <div style={styles.layout}>
        <div style={styles.mapWrapper}>
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
                    text: vehicleIcon[v.type] || "🚗",
                    fontSize: "20px",
                  }}
                />
              ))}
              {selected && (
                <InfoWindow
                  position={{ lat: selected.latitude, lng: selected.longitude }}
                  onCloseClick={() => setSelected(null)}
                >
                  <div style={styles.infoWindow}>
                    <strong>
                      {vehicleIcon[selected.type]} {selected.vehicleId}
                    </strong>
                    <p>Driver: {selected.driverName || "N/A"}</p>
                    <p>
                      Status:{" "}
                      <span style={{ color: statusColor[selected.status] }}>
                        {selected.status}
                      </span>
                    </p>
                    <p>
                      Updated:{" "}
                      {selected.lastUpdated
                        ? new Date(selected.lastUpdated).toLocaleTimeString()
                        : "N/A"}
                    </p>
                  </div>
                </InfoWindow>
              )}
            </GoogleMap>
          ) : (
            <div style={styles.mapLoading}>Loading map...</div>
          )}
        </div>

        <div style={styles.vehicleList}>
          <h3 style={styles.listTitle}>Fleet Status ({vehicles.length})</h3>
          {vehicles.map((v) => (
            <div
              key={v.vehicleId}
              style={styles.vehicleCard}
              onClick={() => v.latitude && setSelected(v)}
            >
              <div style={styles.vehicleHeader}>
                <span style={styles.vehicleId}>
                  {vehicleIcon[v.type]} {v.vehicleId}
                </span>
                <span
                  style={{
                    ...styles.statusDot,
                    backgroundColor: statusColor[v.status] || "#6b7280",
                  }}
                >
                  {v.status}
                </span>
              </div>
              <p style={styles.vehicleInfo}>Driver: {v.driverName || "N/A"}</p>
              <p style={styles.vehicleInfo}>
                {v.latitude
                  ? `📍 ${v.latitude.toFixed(4)}, ${v.longitude.toFixed(4)}`
                  : "📍 No location yet"}
              </p>
            </div>
          ))}
          {vehicles.length === 0 && (
            <p style={styles.empty}>No vehicles registered yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { padding: "24px", maxWidth: "1400px", margin: "0 auto" },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "4px",
  },
  title: { fontSize: "24px", fontWeight: "bold", color: "#1a3a5c", margin: 0 },
  connBadge: {
    padding: "4px 12px",
    borderRadius: "20px",
    fontSize: "13px",
    fontWeight: "600",
  },
  subtitle: { fontSize: "13px", color: "#9ca3af", margin: "0 0 20px" },
  layout: { display: "grid", gridTemplateColumns: "1fr 300px", gap: "20px" },
  mapWrapper: {},
  mapLoading: {
    height: "500px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f3f4f6",
    borderRadius: "8px",
  },
  vehicleList: { display: "flex", flexDirection: "column", gap: "10px" },
  listTitle: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#1a3a5c",
    margin: "0 0 8px",
  },
  vehicleCard: {
    backgroundColor: "white",
    borderRadius: "8px",
    padding: "14px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
    cursor: "pointer",
    borderLeft: "3px solid #3b82f6",
  },
  vehicleHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "6px",
  },
  vehicleId: { fontSize: "14px", fontWeight: "600", color: "#1a3a5c" },
  statusDot: {
    padding: "2px 8px",
    borderRadius: "10px",
    fontSize: "11px",
    color: "white",
    fontWeight: "500",
  },
  vehicleInfo: { fontSize: "12px", color: "#6b7280", margin: "2px 0" },
  infoWindow: { fontSize: "13px", lineHeight: "1.6" },
  empty: {
    color: "#9ca3af",
    fontSize: "13px",
    textAlign: "center",
    padding: "20px",
  },
};
