import React, { useState, useCallback } from "react";
import { GoogleMap, useJsApiLoader, Marker } from "@react-google-maps/api";
import { createIncident } from "../services/api";

const mapContainerStyle = {
  width: "100%",
  height: "400px",
  borderRadius: "8px",
};
const defaultCenter = { lat: 5.6037, lng: -0.187 }; // Accra, Ghana

export default function IncidentForm() {
  const [form, setForm] = useState({
    citizenName: "",
    incidentType: "robbery",
    notes: "",
  });
  const [location, setLocation] = useState(null);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_KEY,
  });

  const handleMapClick = useCallback((e) => {
    setLocation({ lat: e.latLng.lat(), lng: e.latLng.lng() });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!location) {
      setError("Please click on the map to select incident location.");
      return;
    }
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await createIncident({
        ...form,
        latitude: location.lat,
        longitude: location.lng,
      });
      setSuccess(res.data.message);
      setForm({ citizenName: "", incidentType: "robbery", notes: "" });
      setLocation(null);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create incident.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Report New Incident</h2>
      <p style={styles.subtitle}>
        Fill in the details and click on the map to set the incident location.
      </p>

      {success && <div style={styles.success}>{success}</div>}
      {error && <div style={styles.error}>{error}</div>}

      <div style={styles.grid}>
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Citizen Name</label>
            <input
              style={styles.input}
              value={form.citizenName}
              onChange={(e) =>
                setForm({ ...form, citizenName: e.target.value })
              }
              placeholder="Name of person reporting"
              required
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Incident Type</label>
            <select
              style={styles.input}
              value={form.incidentType}
              onChange={(e) =>
                setForm({ ...form, incidentType: e.target.value })
              }
            >
              <option value="robbery">Robbery</option>
              <option value="crime">Crime</option>
              <option value="fire">Fire</option>
              <option value="medical_emergency">Medical Emergency</option>
              <option value="accident">Accident</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Additional Notes</label>
            <textarea
              style={{ ...styles.input, height: "80px", resize: "vertical" }}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Any additional details about the incident..."
            />
          </div>
          {location && (
            <div style={styles.locationInfo}>
              📍 Location selected: {location.lat.toFixed(4)},{" "}
              {location.lng.toFixed(4)}
            </div>
          )}
          <button type="submit" style={styles.btn} disabled={loading}>
            {loading ? "Submitting..." : "🚨 Submit Incident"}
          </button>
        </form>

        <div style={styles.mapContainer}>
          <label style={styles.label}>
            Click on map to select incident location
          </label>
          {isLoaded ? (
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={defaultCenter}
              zoom={12}
              onClick={handleMapClick}
            >
              {location && <Marker position={location} />}
            </GoogleMap>
          ) : (
            <div style={styles.mapLoading}>Loading map...</div>
          )}
        </div>
      </div>
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
  subtitle: { fontSize: "14px", color: "#6b7280", margin: "0 0 24px" },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    backgroundColor: "white",
    padding: "24px",
    borderRadius: "10px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
  },
  field: { display: "flex", flexDirection: "column", gap: "6px" },
  label: { fontSize: "13px", fontWeight: "600", color: "#374151" },
  input: {
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #d1d5db",
    fontSize: "14px",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  },
  btn: {
    backgroundColor: "#dc2626",
    color: "white",
    padding: "12px",
    borderRadius: "8px",
    border: "none",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
  },
  locationInfo: {
    backgroundColor: "#dbeafe",
    color: "#1d4ed8",
    padding: "10px 14px",
    borderRadius: "8px",
    fontSize: "13px",
  },
  mapContainer: { display: "flex", flexDirection: "column", gap: "8px" },
  mapLoading: {
    height: "400px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f3f4f6",
    borderRadius: "8px",
  },
  success: {
    backgroundColor: "#dcfce7",
    color: "#16a34a",
    padding: "12px 16px",
    borderRadius: "8px",
    marginBottom: "16px",
    fontSize: "14px",
  },
  error: {
    backgroundColor: "#fee2e2",
    color: "#dc2626",
    padding: "12px 16px",
    borderRadius: "8px",
    marginBottom: "16px",
    fontSize: "14px",
  },
};
