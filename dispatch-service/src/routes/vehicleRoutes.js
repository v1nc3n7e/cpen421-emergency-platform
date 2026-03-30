const express = require("express");
const router = express.Router();
const {
  registerVehicle,
  getVehicles,
  getVehicleLocation,
  updateLocation,
  updateStatus,
  assignToIncident,
  getVehiclesByIncident,
} = require("../controllers/vehicleController");
const { authenticate, authorize } = require("../middleware/auth");
const {
  validate,
  registerVehicleRules,
  locationRules,
} = require("../middleware/validate");

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
router.get("/vehicles", authenticate, getVehicles);
router.get("/vehicles/:id/location", authenticate, getVehicleLocation);
router.put(
  "/vehicles/:id/location",
  authenticate,
  locationRules,
  validate,
  updateLocation,
);
router.put("/vehicles/:id/status", authenticate, updateStatus);
router.post(
  "/vehicles/assign",
  authenticate,
  authorize("system_admin"),
  assignToIncident,
);
router.get(
  "/vehicles/incident/:incidentId",
  authenticate,
  getVehiclesByIncident,
);

module.exports = router;
