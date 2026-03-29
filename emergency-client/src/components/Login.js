import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { loginUser } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await login({ email, password });
      const { user, accessToken, refreshToken } = res.data.data;
      loginUser(user, accessToken, refreshToken);
      navigate("/dashboard");
    } catch (err) {
      setError(
        err.response?.data?.message || "Invalid credentials. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.page}>
      <div style={s.left}>
        <div style={s.brand}>
          <div style={s.logo}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2L3 7v10l9 5 9-5V7L12 2z"
                stroke="#ef4444"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <path
                d="M12 22V12M3 7l9 5 9-5"
                stroke="#ef4444"
                strokeWidth="2"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span style={s.brandName}>EmergencyGH</span>
        </div>
        <div style={s.heroText}>
          <h1 style={s.heroH1}>
            National Emergency
            <br />
            Response Platform
          </h1>
          <p style={s.heroSub}>
            Coordinating emergency services across Ghana — faster response,
            safer communities.
          </p>
        </div>
        <div style={s.stats}>
          {[
            ["4", "Microservices"],
            ["Real-time", "GPS Tracking"],
            ["JWT", "Secured"],
          ].map(([val, label]) => (
            <div key={label} style={s.stat}>
              <span style={s.statVal}>{val}</span>
              <span style={s.statLabel}>{label}</span>
            </div>
          ))}
        </div>
        <p style={s.university}>University of Ghana — CPEN 421</p>
      </div>

      <div style={s.right}>
        <div style={s.card}>
          <h2 style={s.cardTitle}>Sign in</h2>
          <p style={s.cardSub}>Enter your credentials to access the platform</p>

          {error && (
            <div style={s.errorBox}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                style={{ flexShrink: 0 }}
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="#dc2626"
                  strokeWidth="2"
                />
                <path
                  d="M12 8v4M12 16h.01"
                  stroke="#dc2626"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={s.form}>
            <div style={s.field}>
              <label style={s.label}>Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={s.input}
                placeholder="admin@dispatch.gov.gh"
                required
              />
            </div>

            <div style={s.field}>
              <label style={s.label}>Password</label>
              <div style={s.inputWrap}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ ...s.input, paddingRight: "44px" }}
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  style={s.eye}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#94a3b8"
                      strokeWidth="2"
                    >
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#94a3b8"
                      strokeWidth="2"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              style={{ ...s.btn, opacity: loading ? 0.7 : 1 }}
              disabled={loading}
            >
              {loading ? (
                <span style={s.spinWrap}>
                  <span style={s.spinner} />
                  Signing in...
                </span>
              ) : (
                "Sign in"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

const s = {
  page: {
    display: "flex",
    minHeight: "100vh",
    fontFamily: "'DM Sans', sans-serif",
  },
  left: {
    flex: 1,
    backgroundColor: "#0f172a",
    padding: "48px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  },
  brand: { display: "flex", alignItems: "center", gap: "10px" },
  logo: {
    width: "40px",
    height: "40px",
    backgroundColor: "#1e293b",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  brandName: {
    fontSize: "18px",
    fontWeight: "600",
    color: "#f8fafc",
    letterSpacing: "-0.3px",
  },
  heroText: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    paddingTop: "40px",
  },
  heroH1: {
    fontSize: "42px",
    fontWeight: "700",
    color: "#f8fafc",
    lineHeight: "1.15",
    letterSpacing: "-1px",
    margin: "0 0 16px",
  },
  heroSub: {
    fontSize: "16px",
    color: "#64748b",
    lineHeight: "1.6",
    margin: 0,
    maxWidth: "340px",
  },
  stats: { display: "flex", gap: "32px", paddingBottom: "16px" },
  stat: { display: "flex", flexDirection: "column", gap: "4px" },
  statVal: { fontSize: "20px", fontWeight: "700", color: "#ef4444" },
  statLabel: {
    fontSize: "12px",
    color: "#475569",
    letterSpacing: "0.5px",
    textTransform: "uppercase",
  },
  university: { fontSize: "12px", color: "#334155", marginTop: "8px" },
  right: {
    width: "480px",
    backgroundColor: "#f8fafc",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "48px",
  },
  card: {
    width: "100%",
    backgroundColor: "#ffffff",
    borderRadius: "16px",
    padding: "40px",
    border: "1px solid #e2e8f0",
  },
  cardTitle: {
    fontSize: "26px",
    fontWeight: "700",
    color: "#0f172a",
    margin: "0 0 6px",
    letterSpacing: "-0.5px",
  },
  cardSub: { fontSize: "14px", color: "#64748b", margin: "0 0 28px" },
  errorBox: {
    display: "flex",
    alignItems: "flex-start",
    gap: "10px",
    backgroundColor: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: "8px",
    padding: "12px 14px",
    fontSize: "13px",
    color: "#dc2626",
    marginBottom: "20px",
  },
  form: { display: "flex", flexDirection: "column", gap: "18px" },
  field: { display: "flex", flexDirection: "column", gap: "6px" },
  label: { fontSize: "13px", fontWeight: "500", color: "#374151" },
  inputWrap: { position: "relative" },
  input: {
    width: "100%",
    padding: "11px 14px",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
    fontSize: "14px",
    color: "#0f172a",
    outline: "none",
    boxSizing: "border-box",
    backgroundColor: "#fff",
    transition: "border-color 0.15s",
  },
  eye: {
    position: "absolute",
    right: "12px",
    top: "50%",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "4px",
    display: "flex",
    alignItems: "center",
  },
  btn: {
    width: "100%",
    padding: "12px",
    backgroundColor: "#0f172a",
    color: "#f8fafc",
    border: "none",
    borderRadius: "8px",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
    marginTop: "8px",
    transition: "background 0.15s",
  },
  spinWrap: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
  },
  spinner: {
    width: "16px",
    height: "16px",
    border: "2px solid rgba(255,255,255,0.3)",
    borderTop: "2px solid white",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
    display: "inline-block",
  },
};
