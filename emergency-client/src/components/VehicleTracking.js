import React, { useEffect, useState, useRef } from "react";
import {
  GoogleMap,
  useJsApiLoader,
  Marker,
  InfoWindow,
  Polyline,
  DirectionsRenderer,
} from "@react-google-maps/api";
import { io } from "socket.io-client";
import {
  getVehicles,
  getOpenIncidents,
  registerVehicle,
  deleteVehicle,
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

// Haversine distance between two lat/lng points (returns km)
const haversineKm = (lat1, lng1, lat2, lng2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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
    latitude: "",
    longitude: "",
  });
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerError, setRegisterError] = useState("");
  const [registerSuccess, setRegisterSuccess] = useState("");
  const [routes, setRoutes] = useState({});          // { [vehicleId]: DirectionsResult }
  const [startPositions, setStartPositions] = useState({}); // { [vehicleId]: {lat,lng} }
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

    socketRef.current.on("vehicle_status_changed", (data) => {
      setVehicles((prev) =>
        prev.map((v) =>
          v.vehicleId === data.vehicleId
            ? {
                ...v,
                status: data.status,
                incidentServiceId: data.incidentServiceId,
              }
            : v,
        ),
      );
    });

    // Auto-refresh vehicles and incidents every 15 seconds
    const refreshInterval = setInterval(async () => {
      try {
        const [v, i] = await Promise.all([getVehicles(), getOpenIncidents()]);
        setVehicles(v.data.data);
        setIncidents(i.data.data);
      } catch (err) {
        console.error("Auto-refresh error:", err);
      }
    }, 15000);

    return () => {
      socketRef.current?.disconnect();
      Object.values(simIntervals.current).forEach(clearInterval);
      clearInterval(refreshInterval);
    };
  }, []);

  // Compute a driving route from start → destination and cache the result
  const fetchRoute = (vehicleId, startLat, startLng, destLat, destLng) => {
    if (!window.google) return;
    const svc = new window.google.maps.DirectionsService();
    svc.route(
      {
        origin: { lat: startLat, lng: startLng },
        destination: { lat: destLat, lng: destLng },
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === window.google.maps.DirectionsStatus.OK) {
          setRoutes((prev) => ({ ...prev, [vehicleId]: result }));
        }
      },
    );
  };

  // When vehicles/incidents load, auto-show routes for already-dispatched vehicles
  useEffect(() => {
    if (!isLoaded) return;
    vehicles.forEach((v) => {
      if (v.status === "dispatched" && v.latitude && v.longitude && v.incidentServiceId) {
        const inc = incidents.find((i) => i.incidentId === v.incidentServiceId);
        if (inc?.latitude && inc?.longitude && !routes[v.vehicleId]) {
          setStartPositions((prev) =>
            prev[v.vehicleId] ? prev : { ...prev, [v.vehicleId]: { lat: v.latitude, lng: v.longitude } },
          );
          fetchRoute(v.vehicleId, v.latitude, v.longitude, inc.latitude, inc.longitude);
        }
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicles, incidents, isLoaded]);

  const handleRegisterVehicle = async () => {
    if (!newVehicle.vehicleId || !newVehicle.stationId || !newVehicle.driverName) {
      setRegisterError("Please fill in all fields.");
      return;
    }
    if (!newVehicle.latitude || !newVehicle.longitude) {
      setRegisterError("Location is required. Click on the map to set the vehicle's starting position.");
      return;
    }
    setRegisterLoading(true);
    setRegisterError("");
    setRegisterSuccess("");
    try {
      const payload = {
        ...newVehicle,
        latitude: newVehicle.latitude ? parseFloat(newVehicle.latitude) : undefined,
        longitude: newVehicle.longitude ? parseFloat(newVehicle.longitude) : undefined,
      };
      await registerVehicle(payload);
      setRegisterSuccess(
        `Vehicle ${newVehicle.vehicleId} registered successfully!`,
      );
      setNewVehicle({
        vehicleId: "",
        type: "ambulance",
        stationId: "",
        driverName: "",
        latitude: "",
        longitude: "",
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

  const simulateMovement = (vehicleId, startLat, startLng, vehicle) => {
    if (simulating[vehicleId]) {
      clearInterval(simIntervals.current[vehicleId]);
      setSimulating((prev) => ({ ...prev, [vehicleId]: false }));
      setRoutes((prev) => { const r = { ...prev }; delete r[vehicleId]; return r; });
      setStartPositions((prev) => { const s = { ...prev }; delete s[vehicleId]; return s; });
      return;
    }
    setSimulating((prev) => ({ ...prev, [vehicleId]: true }));
    let lat = startLat || 5.6037;
    let lng = startLng || -0.187;

    // Record the starting position and fetch the route to the incident
    setStartPositions((prev) => ({ ...prev, [vehicleId]: { lat, lng } }));
    const assignedInc = incidents.find((i) => i.incidentId === vehicle?.incidentServiceId);
    if (assignedInc?.latitude && assignedInc?.longitude) {
      fetchRoute(vehicleId, lat, lng, assignedInc.latitude, assignedInc.longitude);
    }

    // Step size per tick ~40 km/h over 3 s ≈ 0.033 km ≈ 0.0003 degrees
    const STEP = 0.0003;

    simIntervals.current[vehicleId] = setInterval(async () => {
      // Look up the vehicle's incident in current state
      const assignedIncident = incidents.find(
        (inc) => inc.incidentId === (vehicle?.incidentServiceId),
      );

      if (assignedIncident && assignedIncident.latitude && assignedIncident.longitude) {
        // Move towards incident location
        const dLat = assignedIncident.latitude - lat;
        const dLng = assignedIncident.longitude - lng;
        const dist = Math.sqrt(dLat * dLat + dLng * dLng);
        if (dist > STEP) {
          lat += (dLat / dist) * STEP;
          lng += (dLng / dist) * STEP;
        } else {
          // Arrived — snap to incident location
          lat = assignedIncident.latitude;
          lng = assignedIncident.longitude;
        }
      } else {
        // No assigned incident — small random drift (idle)
        lat += (Math.random() - 0.5) * 0.0005;
        lng += (Math.random() - 0.5) * 0.0005;
      }

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

  const handleMapClick = (e) => {
    if (showRegisterForm) {
      setNewVehicle((prev) => ({
        ...prev,
        latitude: e.latLng.lat().toFixed(6),
        longitude: e.latLng.lng().toFixed(6),
      }));
    }
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

  const handleDeleteVehicle = async (vehicleId) => {
    if (!window.confirm(`Delete vehicle ${vehicleId}? This cannot be undone.`)) return;
    try {
      await deleteVehicle(vehicleId);
      setVehicles((prev) => prev.filter((v) => v.vehicleId !== vehicleId));
      setRoutes((prev) => { const r = { ...prev }; delete r[vehicleId]; return r; });
      setStartPositions((prev) => { const s = { ...prev }; delete s[vehicleId]; return s; });
      if (simulating[vehicleId]) {
        clearInterval(simIntervals.current[vehicleId]);
        setSimulating((prev) => { const s = { ...prev }; delete s[vehicleId]; return s; });
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete vehicle.");
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
          <p style={s.subtitle}>
            Real-time GPS tracking via WebSocket · Auto-refreshes every 15s
          </p>
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
          <div style={s.locationPickRow}>
            <span style={s.locationPickLabel}>Starting Location</span>
            <div style={{
              ...s.locationPickDisplay,
              borderColor: newVehicle.latitude ? "#22c55e" : "#e2e8f0",
              color: newVehicle.latitude ? "#16a34a" : "#94a3b8",
            }}>
              {newVehicle.latitude
                ? `📍 ${parseFloat(newVehicle.latitude).toFixed(4)}, ${parseFloat(newVehicle.longitude).toFixed(4)}`
                : "Click anywhere on the map below to set the vehicle's starting position"}
            </div>
            {newVehicle.latitude && (
              <button
                style={s.clearLocBtn}
                onClick={() => setNewVehicle((prev) => ({ ...prev, latitude: "", longitude: "" }))}
              >
                Clear
              </button>
            )}
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
          {Object.keys(routes).length > 0 && (
            <div style={s.mapLegend}>
              <span style={s.legendItem}><span style={{ ...s.legendDot, backgroundColor: "#16a34a" }}>S</span> Start</span>
              <span style={s.legendItem}><span style={{ ...s.legendDot, backgroundColor: "#dc2626" }}>D</span> Destination</span>
              <span style={s.legendItem}><span style={{ ...s.legendLine, backgroundColor: "#2563eb" }} /> Route</span>
              <span style={s.legendItem}><span style={{ ...s.legendLine, backgroundColor: "#94a3b8" }} /> Traveled</span>
            </div>
          )}
          {showRegisterForm && (
            <div style={s.mapBanner}>
              {newVehicle.latitude
                ? `Location set: ${parseFloat(newVehicle.latitude).toFixed(4)}, ${parseFloat(newVehicle.longitude).toFixed(4)} — click again to change`
                : "Click on the map to set the vehicle's starting location"}
            </div>
          )}
          {isLoaded ? (
            <GoogleMap
              mapContainerStyle={{
                ...mapContainerStyle,
                cursor: showRegisterForm ? "crosshair" : "default",
              }}
              center={center}
              zoom={12}
              onClick={handleMapClick}
            >
              {/* Pin showing selected registration location */}
              {showRegisterForm && newVehicle.latitude && (
                <Marker
                  position={{
                    lat: parseFloat(newVehicle.latitude),
                    lng: parseFloat(newVehicle.longitude),
                  }}
                  label={{ text: "🚩", fontSize: "22px", color: "transparent" }}
                />
              )}
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
              {/* Breadcrumb trail (actual path traveled) */}
              {Object.entries(paths).map(
                ([vid, path]) =>
                  path.length > 1 && (
                    <Polyline
                      key={vid}
                      path={path}
                      options={{
                        strokeColor: "#94a3b8",
                        strokeWeight: 2,
                        strokeOpacity: 0.5,
                        strokeDasharray: "4 4",
                      }}
                    />
                  ),
              )}

              {/* Planned driving routes */}
              {Object.entries(routes).map(([vid, result]) => (
                <DirectionsRenderer
                  key={vid}
                  directions={result}
                  options={{
                    suppressMarkers: true,
                    polylineOptions: {
                      strokeColor: "#2563eb",
                      strokeWeight: 4,
                      strokeOpacity: 0.75,
                    },
                  }}
                />
              ))}

              {/* Start position markers (green flag) */}
              {Object.entries(startPositions).map(([vid, pos]) => (
                <Marker
                  key={`start-${vid}`}
                  position={pos}
                  title={`${vid} — start`}
                  icon={{
                    url:
                      "data:image/svg+xml;charset=UTF-8," +
                      encodeURIComponent(
                        `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
                          <circle cx="14" cy="14" r="13" fill="#16a34a" stroke="white" stroke-width="2"/>
                          <text x="14" y="20" text-anchor="middle" font-size="14" fill="white">S</text>
                          <line x1="14" y1="27" x2="14" y2="36" stroke="#16a34a" stroke-width="2"/>
                        </svg>`,
                      ),
                    scaledSize: new window.google.maps.Size(28, 36),
                    anchor: new window.google.maps.Point(14, 36),
                  }}
                />
              ))}

              {/* Destination markers (red pin) for dispatched vehicles */}
              {vehicles
                .filter((v) => v.incidentServiceId && startPositions[v.vehicleId])
                .map((v) => {
                  const inc = incidents.find((i) => i.incidentId === v.incidentServiceId);
                  if (!inc?.latitude) return null;
                  return (
                    <Marker
                      key={`dest-${v.vehicleId}`}
                      position={{ lat: inc.latitude, lng: inc.longitude }}
                      title={`Incident — ${inc.incidentType} (${inc.citizenName})`}
                      icon={{
                        url:
                          "data:image/svg+xml;charset=UTF-8," +
                          encodeURIComponent(
                            `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
                              <circle cx="14" cy="14" r="13" fill="#dc2626" stroke="white" stroke-width="2"/>
                              <text x="14" y="20" text-anchor="middle" font-size="14" fill="white">D</text>
                              <line x1="14" y1="27" x2="14" y2="36" stroke="#dc2626" stroke-width="2"/>
                            </svg>`,
                          ),
                        scaledSize: new window.google.maps.Size(28, 36),
                        anchor: new window.google.maps.Point(14, 36),
                      }}
                    />
                  );
                })}
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
                {v.incidentServiceId && (() => {
                  const inc = incidents.find(i => i.incidentId === v.incidentServiceId);
                  const distKm = (v.latitude && v.longitude && inc?.latitude && inc?.longitude)
                    ? haversineKm(v.latitude, v.longitude, inc.latitude, inc.longitude)
                    : null;
                  // ETA assuming avg speed 40 km/h
                  const etaMin = distKm !== null ? (distKm / 40) * 60 : null;
                  return (
                    <>
                      <p style={{ ...s.vInfo, color: "#ef4444" }}>
                        🚨 Incident: {v.incidentServiceId.slice(0, 8)}...
                      </p>
                      {distKm !== null && (
                        <div style={s.distBadge}>
                          <span>📏 {distKm < 1 ? `${(distKm * 1000).toFixed(0)} m` : `${distKm.toFixed(2)} km`}</span>
                          <span style={{ color: "#6366f1" }}>⏱ ETA ~{etaMin < 1 ? `${(etaMin * 60).toFixed(0)}s` : `${etaMin.toFixed(1)} min`}</span>
                        </div>
                      )}
                    </>
                  );
                })()}
                <div style={s.vActions}>
                  <button
                    style={{
                      ...s.simBtn,
                      flex: 1,
                      backgroundColor: simulating[v.vehicleId]
                        ? "#fef2f2"
                        : "#f0fdf4",
                      color: simulating[v.vehicleId] ? "#dc2626" : "#16a34a",
                      border: `1px solid ${simulating[v.vehicleId] ? "#fecaca" : "#bbf7d0"}`,
                    }}
                    onClick={() =>
                      simulateMovement(v.vehicleId, v.latitude, v.longitude, v)
                    }
                  >
                    {simulating[v.vehicleId] ? "⏹ Stop GPS" : "▶ Simulate GPS"}
                  </button>
                  {user?.role === "system_admin" && (
                    <button
                      style={s.deleteBtn}
                      onClick={() => handleDeleteVehicle(v.vehicleId)}
                      title="Delete vehicle"
                    >
                      🗑
                    </button>
                  )}
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
  vActions: { marginTop: "10px", display: "flex", gap: "6px" },
  deleteBtn: {
    padding: "7px 10px",
    backgroundColor: "#fef2f2",
    color: "#dc2626",
    border: "1px solid #fecaca",
    borderRadius: "7px",
    fontSize: "13px",
    cursor: "pointer",
    flexShrink: 0,
  },
  simBtn: {
    width: "100%",
    padding: "7px",
    borderRadius: "7px",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
  },
  mapLegend: {
    display: "flex",
    gap: "16px",
    alignItems: "center",
    backgroundColor: "white",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    padding: "7px 14px",
    marginBottom: "8px",
    flexWrap: "wrap",
  },
  legendItem: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    fontSize: "12px",
    color: "#374151",
    fontWeight: "500",
  },
  legendDot: {
    width: "18px",
    height: "18px",
    borderRadius: "50%",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    color: "white",
    fontSize: "10px",
    fontWeight: "700",
    flexShrink: 0,
  },
  legendLine: {
    display: "inline-block",
    width: "24px",
    height: "3px",
    borderRadius: "2px",
    flexShrink: 0,
  },
  mapBanner: {
    backgroundColor: "#eff6ff",
    border: "1px solid #bfdbfe",
    color: "#1d4ed8",
    fontSize: "12px",
    fontWeight: "500",
    padding: "8px 14px",
    borderRadius: "8px",
    marginBottom: "8px",
    textAlign: "center",
  },
  locationPickRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "12px",
    flexWrap: "wrap",
  },
  locationPickLabel: {
    fontSize: "12px",
    fontWeight: "600",
    color: "#374151",
    whiteSpace: "nowrap",
  },
  locationPickDisplay: {
    flex: 1,
    padding: "9px 12px",
    borderRadius: "7px",
    border: "1px solid",
    fontSize: "12px",
    backgroundColor: "#f8fafc",
    minWidth: "200px",
  },
  clearLocBtn: {
    padding: "7px 12px",
    backgroundColor: "#fef2f2",
    color: "#dc2626",
    border: "1px solid #fecaca",
    borderRadius: "7px",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  distBadge: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "11px",
    fontWeight: "600",
    color: "#dc2626",
    backgroundColor: "#fef2f2",
    padding: "4px 8px",
    borderRadius: "6px",
    margin: "4px 0",
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
