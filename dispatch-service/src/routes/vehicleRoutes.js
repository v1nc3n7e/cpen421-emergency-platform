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
  getVehicleHistory,
  deleteVehicle,
  autoAssignVehicle,
} = require("../controllers/vehicleController");
const { authenticate, authorize, authenticateInternal } = require("../middleware/auth");
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
router.get("/vehicles/:id/history", authenticate, getVehicleHistory);
router.delete(
  "/vehicles/:id",
  authenticate,
  authorize("system_admin"),
  deleteVehicle,
);

// Internal endpoint — called by incident-service to auto-assign a vehicle
router.post("/vehicles/auto-assign", authenticateInternal, autoAssignVehicle);

module.exports = router;
