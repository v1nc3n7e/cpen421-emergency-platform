const Vehicle = require("../models/Vehicle");
const { Op } = require("sequelize");

const registerVehicle = async (req, res) => {
  try {
    const { vehicleId, type, stationId, driverName } = req.body;
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

    // Broadcast status change
    const io = req.app.get("io");
    if (io) {
      io.to("admin_room").emit("vehicle_status_changed", {
        vehicleId: vehicle.vehicleId,
        status: vehicle.status,
        incidentServiceId: vehicle.incidentServiceId,
      });
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

module.exports = {
  registerVehicle,
  getVehicles,
  getVehicleLocation,
  updateLocation,
  updateStatus,
  assignToIncident,
  getVehiclesByIncident,
};
