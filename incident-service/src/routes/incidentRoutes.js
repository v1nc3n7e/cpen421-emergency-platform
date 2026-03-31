const express = require("express");
const router = express.Router();
const {
  createIncident,
  getOpenIncidents,
  getIncident,
  updateStatus,
  assignResponder,
  createResponder,
  getResponders,
  createHospital,
  getHospitals,
  updateHospitalBeds,
} = require("../controllers/incidentController");
const { authenticate, authorize } = require("../middleware/auth");
const {
  validate,
  incidentRules,
  statusRules,
  responderRules,
  hospitalRules,
} = require("../middleware/validate");

// Incident routes
router.post(
  "/incidents",
  authenticate,
  authorize("system_admin"),
  incidentRules,
  validate,
  createIncident,
);
router.get("/incidents/open", authenticate, getOpenIncidents);
router.get("/incidents/:id", authenticate, getIncident);
router.put(
  "/incidents/:id/status",
  authenticate,
  statusRules,
  validate,
  updateStatus,
);
router.put(
  "/incidents/:id/assign",
  authenticate,
  authorize("system_admin"),
  assignResponder,
);

// Responder routes
router.post(
  "/responders",
  authenticate,
  authorize(
    "system_admin",
    "hospital_admin",
    "police_admin",
    "fire_service_admin",
  ),
  responderRules,
  validate,
  createResponder,
);
router.get("/responders", authenticate, getResponders);

// Hospital routes
router.post(
  "/hospitals",
  authenticate,
  authorize("system_admin", "hospital_admin"),
  hospitalRules,
  validate,
  createHospital,
);
router.get("/hospitals", authenticate, getHospitals);
router.put(
  "/hospitals/:id/beds",
  authenticate,
  authorize("system_admin", "hospital_admin"),
  updateHospitalBeds,
);

module.exports = router;
