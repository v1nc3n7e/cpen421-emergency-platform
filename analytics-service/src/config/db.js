const { Pool } = require("pg");

const sslConfig =
  process.env.NODE_ENV === "production"
    ? { ssl: { rejectUnauthorized: false } }
    : {};

const incidentPool = new Pool({
  connectionString: process.env.INCIDENT_DB_URL,
  ...sslConfig,
});

const dispatchPool = new Pool({
  connectionString: process.env.DISPATCH_DB_URL,
  ...sslConfig,
});

const connectDB = async () => {
  try {
    await incidentPool.query("SELECT 1");
    console.log("Incident DB connected.");
    await dispatchPool.query("SELECT 1");
    console.log("Dispatch DB connected.");
  } catch (error) {
    console.error("Database connection error:", error.message);
    process.exit(1);
  }
};

module.exports = { incidentPool, dispatchPool, connectDB };
