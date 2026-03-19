const express = require("express");
const router = express.Router();
const {
  registerVehicle,
  getVehicles,
  getVehicleLocation,
  updateLocation,
  updateStatus,
} = require("../controllers/vehicleController");
const { authenticate, authorize } = require("../middleware/auth");
const {
  validate,
  registerVehicleRules,
  locationRules,
} = require("../middleware/validate");

// Register a new vehicle
router.post(
  "/vehicles/register",
  authenticate,
  authorize(
    "system_admin",
    "hospital_admin",
    "police_admin",
    "fire_service_admin",
  ),
  registerVehicleRules,
  validate,
  registerVehicle,
);

// Get all vehicles
router.get("/vehicles", authenticate, getVehicles);

// Get vehicle location
router.get("/vehicles/:id/location", authenticate, getVehicleLocation);

// Update vehicle GPS location (driver's phone)
router.put(
  "/vehicles/:id/location",
  authenticate,
  locationRules,
  validate,
  updateLocation,
);

// Update vehicle status
router.put("/vehicles/:id/status", authenticate, updateStatus);

module.exports = router;
