const express = require("express");
const router = express.Router();
const {
  getResponseTimes,
  getIncidentsByRegion,
  getResourceUtilization,
  getHospitalCapacity,
} = require("../controllers/analyticsController");
const { authenticate } = require("../middleware/auth");

router.get("/analytics/response-times", authenticate, getResponseTimes);
router.get(
  "/analytics/incidents-by-region",
  authenticate,
  getIncidentsByRegion,
);
router.get(
  "/analytics/resource-utilization",
  authenticate,
  getResourceUtilization,
);
router.get("/analytics/hospital-capacity", authenticate, getHospitalCapacity);

module.exports = router;
