const express = require("express");
const router = express.Router();
const {
  getResponseTimes,
  getIncidentsByRegion,
  getResourceUtilization,
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

module.exports = router;
