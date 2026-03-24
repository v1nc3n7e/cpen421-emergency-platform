import React, { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  getResponseTimes,
  getIncidentsByRegion,
  getResourceUtilization,
} from "../services/api";

const COLORS = [
  "#2563eb",
  "#16a34a",
  "#dc2626",
  "#f59e0b",
  "#8b5cf6",
  "#0ea5e9",
];

export default function Analytics() {
  const [responseTimes, setResponseTimes] = useState(null);
  const [incidentStats, setIncidentStats] = useState(null);
  const [utilization, setUtilization] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getResponseTimes(),
      getIncidentsByRegion(),
      getResourceUtilization(),
    ])
      .then(([rt, is, ru]) => {
        setResponseTimes(rt.data.data);
        setIncidentStats(is.data.data);
        setUtilization(ru.data.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={styles.loading}>Loading analytics...</div>;

  const incidentTypeData =
    incidentStats?.byIncidentType?.map((i) => ({
      name: i.incident_type.replace("_", " "),
      total: parseInt(i.total),
      resolved: parseInt(i.resolved),
      open: parseInt(i.open),
    })) || [];

  const statusData =
    incidentStats?.byStatus?.map((s) => ({
      name: s.status.replace("_", " "),
      value: parseInt(s.total),
    })) || [];

  const responderData =
    utilization?.responderUtilization?.map((r) => ({
      name: r.type,
      available: parseInt(r.available),
      deployed: parseInt(r.deployed),
    })) || [];

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Analytics & Monitoring</h2>
      <p style={styles.subtitle}>Real-time operational insights</p>

      {/* Summary Cards */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statNum}>
            {responseTimes?.overall?.total_incidents || 0}
          </div>
          <div style={styles.statLabel}>Total Incidents</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statNum}>
            {responseTimes?.overall?.resolved || 0}
          </div>
          <div style={styles.statLabel}>Resolved</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statNum}>
            {responseTimes?.overall?.overall_avg_response_minutes || "0.00"} min
          </div>
          <div style={styles.statLabel}>Avg Response Time</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statNum}>{utilization?.vehicles?.length || 0}</div>
          <div style={styles.statLabel}>Total Vehicles</div>
        </div>
      </div>

      <div style={styles.chartsGrid}>
        {/* Incidents by Type */}
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Incidents by Type</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={incidentTypeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="total" fill="#2563eb" name="Total" />
              <Bar dataKey="resolved" fill="#16a34a" name="Resolved" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Status Distribution */}
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Incident Status Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey="value"
                nameKey="name"
                label
              >
                {statusData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Responder Utilization */}
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Responder Utilization</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={responderData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="available" fill="#16a34a" name="Available" />
              <Bar dataKey="deployed" fill="#ef4444" name="Deployed" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Deployed Responders */}
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Top Deployed Responders</h3>
          {utilization?.topDeployedResponders?.length > 0 ? (
            <table style={styles.table}>
              <thead>
                <tr style={{ backgroundColor: "#f3f4f6" }}>
                  <th style={styles.th}>Responder</th>
                  <th style={styles.th}>Times Deployed</th>
                </tr>
              </thead>
              <tbody>
                {utilization.topDeployedResponders.map((r, i) => (
                  <tr key={i}>
                    <td style={styles.td}>{r.assigned_unit}</td>
                    <td
                      style={{
                        ...styles.td,
                        fontWeight: "600",
                        color: "#2563eb",
                      }}
                    >
                      {r.times_deployed}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={styles.empty}>No deployment data yet.</p>
          )}
        </div>
      </div>

      {/* Response Times Table */}
      <div style={styles.chartCard}>
        <h3 style={styles.chartTitle}>Response Times by Incident Type</h3>
        {responseTimes?.byIncidentType?.length > 0 ? (
          <table style={styles.table}>
            <thead>
              <tr style={{ backgroundColor: "#f3f4f6" }}>
                <th style={styles.th}>Incident Type</th>
                <th style={styles.th}>Total</th>
                <th style={styles.th}>Avg (min)</th>
                <th style={styles.th}>Min (min)</th>
                <th style={styles.th}>Max (min)</th>
              </tr>
            </thead>
            <tbody>
              {responseTimes.byIncidentType.map((r, i) => (
                <tr
                  key={i}
                  style={{ backgroundColor: i % 2 === 0 ? "white" : "#f9fafb" }}
                >
                  <td style={styles.td}>{r.incident_type.replace("_", " ")}</td>
                  <td style={styles.td}>{r.total_incidents}</td>
                  <td style={styles.td}>{r.avg_response_time_minutes}</td>
                  <td style={styles.td}>{r.min_response_time_minutes}</td>
                  <td style={styles.td}>{r.max_response_time_minutes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={styles.empty}>No response time data yet.</p>
        )}
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
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "16px",
    marginBottom: "24px",
  },
  statCard: {
    backgroundColor: "white",
    borderRadius: "10px",
    padding: "20px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
    borderTop: "4px solid #2563eb",
  },
  statNum: { fontSize: "32px", fontWeight: "bold", color: "#1a3a5c" },
  statLabel: { fontSize: "13px", color: "#6b7280", marginTop: "4px" },
  chartsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "20px",
    marginBottom: "20px",
  },
  chartCard: {
    backgroundColor: "white",
    borderRadius: "10px",
    padding: "20px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
  },
  chartTitle: {
    fontSize: "15px",
    fontWeight: "600",
    color: "#1a3a5c",
    margin: "0 0 16px",
  },
  table: { width: "100%", borderCollapse: "collapse" },
  th: {
    padding: "10px 12px",
    textAlign: "left",
    fontSize: "12px",
    fontWeight: "600",
    color: "#374151",
  },
  td: {
    padding: "10px 12px",
    fontSize: "13px",
    color: "#374151",
    borderBottom: "1px solid #f3f4f6",
  },
  loading: {
    display: "flex",
    justifyContent: "center",
    padding: "60px",
    color: "#6b7280",
  },
  empty: {
    color: "#9ca3af",
    fontSize: "13px",
    textAlign: "center",
    padding: "20px",
  },
};
