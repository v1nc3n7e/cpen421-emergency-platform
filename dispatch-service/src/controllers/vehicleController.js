const Vehicle = require("../models/Vehicle");

/**
 * POST /vehicles/register
 * Register a new vehicle
 */
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

    return res.status(201).json({
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

/**
 * GET /vehicles
 * Get all vehicles with optional filters
 */
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

/**
 * GET /vehicles/:id/location
 * Get current location of a specific vehicle
 */
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
      },
    });
  } catch (error) {
    console.error("Get vehicle location error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error." });
  }
};

/**
 * PUT /vehicles/:id/location
 * Update vehicle GPS location (called by driver's phone)
 */
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

/**
 * PUT /vehicles/:id/status
 * Update vehicle status
 */
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
    await vehicle.save();

    return res.status(200).json({
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

module.exports = {
  registerVehicle,
  getVehicles,
  getVehicleLocation,
  updateLocation,
  updateStatus,
};
