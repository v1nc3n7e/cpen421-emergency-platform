import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axios from "axios";

export default function Register() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "hospital_admin",
    stationId: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (user?.role !== "system_admin") {
    return (
      <div style={styles.container}>
        <div style={styles.denied}>
          <div style={{ fontSize: "48px" }}>🚫</div>
          <h2>Access Denied</h2>
          <p>Only system administrators can register new users.</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (!/[A-Z]/.test(form.password)) {
      setError("Password must contain at least one uppercase letter.");
      return;
    }
    if (!/[0-9]/.test(form.password)) {
      setError("Password must contain at least one number.");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("accessToken");
      await axios.post(
        `${process.env.REACT_APP_AUTH_SERVICE}/auth/register`,
        {
          name: form.name,
          email: form.email,
          password: form.password,
          role: form.role,
          stationId: form.stationId || null,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setSuccess(`Account created successfully for ${form.name}!`);
      setForm({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
        role: "hospital_admin",
        stationId: "",
      });
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  const passwordMatch =
    form.confirmPassword && form.password === form.confirmPassword;
  const passwordNoMatch =
    form.confirmPassword && form.password !== form.confirmPassword;

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>Register New User</h2>
        <p style={styles.subtitle}>
          Create accounts for hospital, police, and fire service staff.
        </p>

        {success && <div style={styles.success}>{success}</div>}
        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.grid}>
            <div style={styles.field}>
              <label style={styles.label}>Full Name</label>
              <input
                style={styles.input}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Kwame Mensah"
                required
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Email Address</label>
              <input
                style={styles.input}
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="e.g. kwame@hospital.gov.gh"
                required
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Password</label>
              <div style={styles.inputWrapper}>
                <input
                  style={{ ...styles.input, paddingRight: "40px" }}
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  placeholder="Min 8 chars, 1 uppercase, 1 number"
                  required
                />
                <button
                  type="button"
                  style={styles.eyeBtn}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Confirm Password</label>
              <div style={styles.inputWrapper}>
                <input
                  style={{
                    ...styles.input,
                    paddingRight: "40px",
                    borderColor: passwordMatch
                      ? "#16a34a"
                      : passwordNoMatch
                        ? "#dc2626"
                        : "#d1d5db",
                  }}
                  type={showConfirm ? "text" : "password"}
                  value={form.confirmPassword}
                  onChange={(e) =>
                    setForm({ ...form, confirmPassword: e.target.value })
                  }
                  placeholder="Re-enter password"
                  required
                />
                <button
                  type="button"
                  style={styles.eyeBtn}
                  onClick={() => setShowConfirm(!showConfirm)}
                >
                  {showConfirm ? "🙈" : "👁️"}
                </button>
              </div>
              {passwordMatch && (
                <span style={styles.matchText}>✅ Passwords match</span>
              )}
              {passwordNoMatch && (
                <span style={styles.noMatchText}>
                  ❌ Passwords do not match
                </span>
              )}
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Role</label>
              <select
                style={styles.input}
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                <option value="hospital_admin">Hospital Admin</option>
                <option value="police_admin">Police Admin</option>
                <option value="fire_service_admin">Fire Service Admin</option>
                <option value="system_admin">System Admin</option>
              </select>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>
                Station / Hospital ID (optional)
              </label>
              <input
                style={styles.input}
                value={form.stationId}
                onChange={(e) =>
                  setForm({ ...form, stationId: e.target.value })
                }
                placeholder="e.g. korle-bu-hospital"
              />
            </div>
          </div>

          <div style={styles.roleInfo}>
            <strong>Role permissions:</strong>
            <ul
              style={{
                margin: "8px 0 0",
                paddingLeft: "20px",
                fontSize: "13px",
              }}
            >
              <li>
                <strong>Hospital Admin</strong> — manages ambulances and
                hospital capacity
              </li>
              <li>
                <strong>Police Admin</strong> — manages police officers and
                vehicles
              </li>
              <li>
                <strong>Fire Service Admin</strong> — manages fire trucks and
                staff
              </li>
              <li>
                <strong>System Admin</strong> — full access to all features
              </li>
            </ul>
          </div>

          <div style={styles.actions}>
            <button
              type="button"
              style={styles.cancelBtn}
              onClick={() => navigate("/dashboard")}
            >
              Cancel
            </button>
            <button type="submit" style={styles.btn} disabled={loading}>
              {loading ? "Creating..." : "Create Account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = {
  container: { padding: "24px", maxWidth: "800px", margin: "0 auto" },
  card: {
    backgroundColor: "white",
    borderRadius: "12px",
    padding: "32px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
  },
  title: {
    fontSize: "24px",
    fontWeight: "bold",
    color: "#1a3a5c",
    margin: "0 0 4px",
  },
  subtitle: { fontSize: "14px", color: "#6b7280", margin: "0 0 24px" },
  form: { display: "flex", flexDirection: "column", gap: "20px" },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" },
  field: { display: "flex", flexDirection: "column", gap: "6px" },
  label: { fontSize: "13px", fontWeight: "600", color: "#374151" },
  inputWrapper: { position: "relative", display: "flex", alignItems: "center" },
  input: {
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #d1d5db",
    fontSize: "14px",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  },
  eyeBtn: {
    position: "absolute",
    right: "10px",
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: "16px",
    padding: "0",
  },
  matchText: { fontSize: "12px", color: "#16a34a" },
  noMatchText: { fontSize: "12px", color: "#dc2626" },
  btn: {
    backgroundColor: "#1a3a5c",
    color: "white",
    padding: "11px 24px",
    borderRadius: "8px",
    border: "none",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
  },
  cancelBtn: {
    backgroundColor: "#f3f4f6",
    color: "#374151",
    padding: "11px 24px",
    borderRadius: "8px",
    border: "none",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
  },
  actions: { display: "flex", justifyContent: "flex-end", gap: "12px" },
  roleInfo: {
    backgroundColor: "#f0f9ff",
    border: "1px solid #bae6fd",
    borderRadius: "8px",
    padding: "14px",
    fontSize: "13px",
    color: "#0369a1",
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
  denied: { textAlign: "center", padding: "60px", color: "#6b7280" },
};
