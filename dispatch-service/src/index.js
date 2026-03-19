require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const swaggerUi = require("swagger-ui-express");
const YAML = require("yamljs");
const { connectDB } = require("./config/db");
const vehicleRoutes = require("./routes/vehicleRoutes");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Make io accessible in controllers
app.set("io", io);

connectDB();

app.use(helmet());
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    service: "Dispatch Tracking Service",
    status: "running",
    timestamp: new Date().toISOString(),
  });
});

const swaggerDocument = YAML.load("./swagger.yaml");
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use("/", vehicleRoutes);

// ── WebSocket Events ───────────────────────────────────────────────────────
io.on("connection", (socket) => {
  console.log(`📡 Client connected: ${socket.id}`);

  // Driver joins a room for their vehicle
  socket.on("join_vehicle", (vehicleId) => {
    socket.join(`vehicle_${vehicleId}`);
    console.log(`🚗 Vehicle ${vehicleId} joined room`);
  });

  // Admin joins the admin room to receive all location updates
  socket.on("join_admin", () => {
    socket.join("admin_room");
    console.log(`👤 Admin joined monitoring room`);
  });

  // Driver sends live GPS location via WebSocket
  socket.on("location_update", async (data) => {
    const { vehicleId, latitude, longitude } = data;

    try {
      const Vehicle = require("./models/Vehicle");
      const vehicle = await Vehicle.findOne({ where: { vehicleId } });

      if (vehicle) {
        vehicle.latitude = latitude;
        vehicle.longitude = longitude;
        vehicle.lastUpdated = new Date();
        await vehicle.save();

        // Broadcast to admin room
        io.to("admin_room").emit("vehicle_moved", {
          vehicleId,
          latitude,
          longitude,
          type: vehicle.type,
          status: vehicle.status,
          driverName: vehicle.driverName,
          lastUpdated: vehicle.lastUpdated,
        });

        console.log(`📍 ${vehicleId} → (${latitude}, ${longitude})`);
      }
    } catch (error) {
      console.error("WebSocket location update error:", error.message);
      socket.emit("error", { message: "Failed to update location." });
    }
  });

  socket.on("disconnect", () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
  });
});

app.use((req, res) => {
  res
    .status(404)
    .json({
      success: false,
      message: `Route ${req.method} ${req.originalUrl} not found.`,
    });
});

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res
    .status(err.status || 500)
    .json({ success: false, message: err.message || "Internal server error." });
});

const PORT = process.env.PORT || 3003;
server.listen(PORT, () => {
  console.log(`\n🚀 Dispatch Tracking Service running on port ${PORT}`);
  console.log(`   ENV: ${process.env.NODE_ENV || "development"}`);
  console.log(`   Health:    http://localhost:${PORT}/health`);
  console.log(`   Docs:      http://localhost:${PORT}/api-docs`);
  console.log(`   WebSocket: ws://localhost:${PORT}\n`);
});

module.exports = { app, io };
