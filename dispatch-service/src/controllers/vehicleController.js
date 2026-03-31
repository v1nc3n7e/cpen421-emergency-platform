const Vehicle = require("../models/Vehicle");
const VehicleLocationHistory = require("../models/VehicleLocationHistory");
const { Op } = require("sequelize");

// In-memory queue for incidents that arrived when no matching vehicle was available.
// Each entry: { incidentId, vehicleType, latitude, longitude, queuedAt }
const pendingQueue = [];

// Map incident type → vehicle type
const vehicleTypeForIncident = (incidentType) => {
  const map = {
    fire: "fire",
    medical_emergency: "ambulance",
    accident: "ambulance",
    robbery: "police",
    crime: "police",
    other: "police",
  };
  return map[incidentType] || "police";
};

// Haversine distance in km
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

// Find the nearest available vehicle of the given type
const findNearestAvailable = async (vehicleType, latitude, longitude) => {
  const candidates = await Vehicle.findAll({
    where: { type: vehicleType, status: "available" },
  });
  if (candidates.length === 0) return null;
  let nearest = null;
  let minDist = Infinity;
  for (const v of candidates) {
    if (v.latitude == null || v.longitude == null) continue;
    const d = haversineKm(latitude, longitude, v.latitude, v.longitude);
    if (d < minDist) { minDist = d; nearest = v; }
  }
  // If no vehicle has a location yet, fall back to the first available one
  return nearest || candidates[0];
};

const registerVehicle = async (req, res) => {
  try {
    const { vehicleId, type, stationId, driverName, latitude, longitude } = req.body;
    const existing = await Vehicle.findOne({ where: { vehicleId } });
    if (existing) {
      return res
        .status(409)
        .json({ success: false, message: "Vehicle ID already registered." });
    }
    const vehicle = await Vehicle.create({
      vehicleId,
      type,
      stationId,
      driverName: driverName || null,
      latitude: latitude || null,
      longitude: longitude || null,
      lastUpdated: latitude ? new Date() : null,
    });
    return res
      .status(201)
      .json({
        success: true,
        message: "Vehicle registered successfully.",
        data: vehicle,
      });
  } catch (error) {
    console.error("Register vehicle error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error." });
  }
};

const getVehicles = async (req, res) => {
  try {
    const { type, status } = req.query;
    const where = {};
    if (type) where.type = type;
    if (status) where.status = status;
    const vehicles = await Vehicle.findAll({
      where,
      order: [["created_at", "DESC"]],
    });
    return res.status(200).json({ success: true, data: vehicles });
  } catch (error) {
    console.error("Get vehicles error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error." });
  }
};

const getVehicleLocation = async (req, res) => {
  try {
    const vehicle = await Vehicle.findOne({
      where: { vehicleId: req.params.id },
    });
    if (!vehicle) {
      return res
        .status(404)
        .json({ success: false, message: "Vehicle not found." });
    }
    return res.status(200).json({
      success: true,
      data: {
        vehicleId: vehicle.vehicleId,
        type: vehicle.type,
        status: vehicle.status,
        latitude: vehicle.latitude,
        longitude: vehicle.longitude,
        lastUpdated: vehicle.lastUpdated,
        incidentServiceId: vehicle.incidentServiceId,
        driverName: vehicle.driverName,
        stationId: vehicle.stationId,
      },
    });
  } catch (error) {
    console.error("Get vehicle location error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error." });
  }
};

const updateLocation = async (req, res) => {
  try {
    const vehicle = await Vehicle.findOne({
      where: { vehicleId: req.params.id },
    });
    if (!vehicle) {
      return res
        .status(404)
        .json({ success: false, message: "Vehicle not found." });
    }
    const { latitude, longitude } = req.body;
    vehicle.latitude = latitude;
    vehicle.longitude = longitude;
    vehicle.lastUpdated = new Date();
    await vehicle.save();

    // Record location history
    await VehicleLocationHistory.create({
      vehicleId: vehicle.vehicleId,
      latitude,
      longitude,
      recordedAt: new Date(),
    });

    // Broadcast to all admins via WebSocket
    const io = req.app.get("io");
    if (io) {
      io.to("admin_room").emit("vehicle_moved", {
        vehicleId: vehicle.vehicleId,
        latitude: vehicle.latitude,
        longitude: vehicle.longitude,
        type: vehicle.type,
        status: vehicle.status,
        driverName: vehicle.driverName,
        incidentServiceId: vehicle.incidentServiceId,
        lastUpdated: vehicle.lastUpdated,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Location updated.",
      data: {
        vehicleId: vehicle.vehicleId,
        latitude: vehicle.latitude,
        longitude: vehicle.longitude,
        lastUpdated: vehicle.lastUpdated,
      },
    });
  } catch (error) {
    console.error("Update location error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error." });
  }
};

const updateStatus = async (req, res) => {
  try {
    const vehicle = await Vehicle.findOne({
      where: { vehicleId: req.params.id },
    });
    if (!vehicle) {
      return res
        .status(404)
        .json({ success: false, message: "Vehicle not found." });
    }
    const { status, incidentServiceId } = req.body;
    vehicle.status = status;
    if (incidentServiceId !== undefined)
      vehicle.incidentServiceId = incidentServiceId;
    if (status === "available") vehicle.incidentServiceId = null;
    await vehicle.save();

    const io = req.app.get("io");
    if (io) {
      io.to("admin_room").emit("vehicle_status_changed", {
        vehicleId: vehicle.vehicleId,
        status: vehicle.status,
        incidentServiceId: vehicle.incidentServiceId,
      });
    }

    // When a vehicle becomes available, check the pending queue for a waiting incident
    if (status === "available" && vehicle.latitude != null && vehicle.longitude != null) {
      const idx = pendingQueue.findIndex((p) => p.vehicleType === vehicle.type);
      if (idx !== -1) {
        const pending = pendingQueue.splice(idx, 1)[0];
        vehicle.status = "dispatched";
        vehicle.incidentServiceId = pending.incidentId;
        vehicle.lastUpdated = new Date();
        await vehicle.save();
        console.log(`✅ Auto-assigned queued incident ${pending.incidentId} to ${vehicle.vehicleId} (queue length: ${pendingQueue.length})`);
        if (io) {
          io.to("admin_room").emit("vehicle_dispatched", {
            vehicleId: vehicle.vehicleId,
            incidentId: pending.incidentId,
            type: vehicle.type,
            driverName: vehicle.driverName,
            latitude: vehicle.latitude,
            longitude: vehicle.longitude,
          });
        }
      }
    }

    return res
      .status(200)
      .json({
        success: true,
        message: "Vehicle status updated.",
        data: vehicle,
      });
  } catch (error) {
    console.error("Update status error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error." });
  }
};

// Assign a vehicle to an incident
const assignToIncident = async (req, res) => {
  try {
    const { vehicleId, incidentId, latitude, longitude } = req.body;
    const vehicle = await Vehicle.findOne({ where: { vehicleId } });
    if (!vehicle) {
      return res
        .status(404)
        .json({ success: false, message: "Vehicle not found." });
    }
    vehicle.status = "dispatched";
    vehicle.incidentServiceId = incidentId;
    if (latitude) vehicle.latitude = latitude;
    if (longitude) vehicle.longitude = longitude;
    vehicle.lastUpdated = new Date();
    await vehicle.save();

    const io = req.app.get("io");
    if (io) {
      io.to("admin_room").emit("vehicle_dispatched", {
        vehicleId: vehicle.vehicleId,
        incidentId,
        type: vehicle.type,
        driverName: vehicle.driverName,
        latitude: vehicle.latitude,
        longitude: vehicle.longitude,
      });
    }

    return res
      .status(200)
      .json({
        success: true,
        message: "Vehicle assigned to incident.",
        data: vehicle,
      });
  } catch (error) {
    console.error("Assign to incident error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error." });
  }
};

// Get all vehicles assigned to a specific incident
const getVehiclesByIncident = async (req, res) => {
  try {
    const vehicles = await Vehicle.findAll({
      where: { incidentServiceId: req.params.incidentId },
    });
    return res.status(200).json({ success: true, data: vehicles });
  } catch (error) {
    console.error("Get vehicles by incident error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error." });
  }
};

// Get location history for a vehicle
const getVehicleHistory = async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    const history = await VehicleLocationHistory.findAll({
      where: { vehicleId: req.params.id },
      order: [["recorded_at", "DESC"]],
      limit: parseInt(limit),
    });
    return res.status(200).json({ success: true, data: history });
  } catch (error) {
    console.error("Get vehicle history error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error." });
  }
};

/**
 * POST /vehicles/auto-assign  (internal — called by incident-service)
 * Try to immediately assign the nearest available vehicle of the right type.
 * If none is available, queue the incident; it will be assigned when a vehicle frees up.
 */
const autoAssignVehicle = async (req, res) => {
  try {
    const { incidentId, incidentType, latitude, longitude } = req.body;
    if (!incidentId || !incidentType || latitude == null || longitude == null) {
      return res.status(422).json({ success: false, message: "incidentId, incidentType, latitude and longitude are required." });
    }

    const vehicleType = vehicleTypeForIncident(incidentType);
    const vehicle = await findNearestAvailable(vehicleType, latitude, longitude);

    if (vehicle) {
      vehicle.status = "dispatched";
      vehicle.incidentServiceId = incidentId;
      vehicle.lastUpdated = new Date();
      await vehicle.save();

      const io = req.app.get("io");
      if (io) {
        io.to("admin_room").emit("vehicle_dispatched", {
          vehicleId: vehicle.vehicleId,
          incidentId,
          type: vehicle.type,
          driverName: vehicle.driverName,
          latitude: vehicle.latitude,
          longitude: vehicle.longitude,
        });
      }

      return res.status(200).json({
        success: true,
        assigned: true,
        message: `Vehicle ${vehicle.vehicleId} assigned to incident ${incidentId}.`,
        data: vehicle,
      });
    }

    // No vehicle available — add to pending queue
    pendingQueue.push({ incidentId, vehicleType, latitude, longitude, queuedAt: new Date() });
    console.log(`⏳ No ${vehicleType} available — incident ${incidentId} queued (queue length: ${pendingQueue.length})`);

    return res.status(202).json({
      success: true,
      assigned: false,
      message: `No ${vehicleType} available. Incident queued and will be assigned automatically when one becomes free.`,
    });
  } catch (error) {
    console.error("Auto-assign vehicle error:", error);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// Delete a vehicle and its location history
const deleteVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findOne({
      where: { vehicleId: req.params.id },
    });
    if (!vehicle) {
      return res
        .status(404)
        .json({ success: false, message: "Vehicle not found." });
    }
    if (vehicle.status === "dispatched") {
      return res.status(409).json({
        success: false,
        message: "Cannot delete a vehicle that is currently dispatched to an incident.",
      });
    }
    await VehicleLocationHistory.destroy({ where: { vehicleId: vehicle.vehicleId } });
    await vehicle.destroy();
    return res
      .status(200)
      .json({ success: true, message: `Vehicle ${vehicle.vehicleId} deleted.` });
  } catch (error) {
    console.error("Delete vehicle error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error." });
  }
};

module.exports = {
  registerVehicle,
  getVehicles,
  getVehicleLocation,
  updateLocation,
  updateStatus,
  assignToIncident,
  getVehiclesByIncident,
  getVehicleHistory,
  deleteVehicle,
  autoAssignVehicle,
};
