const Incident = require("../models/Incident");
const Responder = require("../models/Responder");
const { calculateDistance } = require("../utils/distance");
const { Op } = require("sequelize");

// Map incident types to responder types
const getResponderType = (incidentType) => {
  const map = {
    robbery: "police",
    crime: "police",
    fire: "fire",
    medical_emergency: "ambulance",
    accident: "ambulance",
    other: "police",
  };
  return map[incidentType];
};

// Find the nearest available responder
const findNearestResponder = async (incidentType, latitude, longitude) => {
  const responderType = getResponderType(incidentType);
  const responders = await Responder.findAll({
    where: { type: responderType, isAvailable: true },
  });

  if (responders.length === 0) return null;

  let nearest = null;
  let minDistance = Infinity;

  for (const responder of responders) {
    const distance = calculateDistance(
      latitude,
      longitude,
      responder.latitude,
      responder.longitude,
    );
    if (distance < minDistance) {
      minDistance = distance;
      nearest = responder;
    }
  }

  return nearest;
};

/**
 * POST /incidents
 * Create a new incident and auto-assign nearest responder
 */
const createIncident = async (req, res) => {
  try {
    const { citizenName, incidentType, latitude, longitude, notes } = req.body;

    const incident = await Incident.create({
      citizenName,
      incidentType,
      latitude,
      longitude,
      notes: notes || null,
      createdBy: req.user.userId,
      status: "created",
    });

    // Auto-assign nearest responder
    const responder = await findNearestResponder(
      incidentType,
      latitude,
      longitude,
    );

    if (responder) {
      incident.assignedUnit = responder.name;
      incident.assignedResponderId = responder.responderId;
      incident.status = "dispatched";
      incident.dispatchedAt = new Date();
      await incident.save();

      // Mark responder as unavailable
      responder.isAvailable = false;
      await responder.save();
    }

    return res.status(201).json({
      success: true,
      message: responder
        ? `Incident created and dispatched to ${responder.name}.`
        : "Incident created. No available responder found.",
      data: incident,
    });
  } catch (error) {
    console.error("Create incident error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error." });
  }
};

/**
 * GET /incidents/open
 * Get all open (unresolved) incidents
 */
const getOpenIncidents = async (req, res) => {
  try {
    const incidents = await Incident.findAll({
      where: { status: { [Op.ne]: "resolved" } },
      order: [["created_at", "DESC"]],
    });
    return res.status(200).json({ success: true, data: incidents });
  } catch (error) {
    console.error("Get open incidents error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error." });
  }
};

/**
 * GET /incidents/:id
 * Get a single incident by ID
 */
const getIncident = async (req, res) => {
  try {
    const incident = await Incident.findOne({
      where: { incidentId: req.params.id },
    });
    if (!incident) {
      return res
        .status(404)
        .json({ success: false, message: "Incident not found." });
    }
    return res.status(200).json({ success: true, data: incident });
  } catch (error) {
    console.error("Get incident error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error." });
  }
};

/**
 * PUT /incidents/:id/status
 * Update incident status
 */
const updateStatus = async (req, res) => {
  try {
    const incident = await Incident.findOne({
      where: { incidentId: req.params.id },
    });
    if (!incident) {
      return res
        .status(404)
        .json({ success: false, message: "Incident not found." });
    }

    const { status } = req.body;
    incident.status = status;

    if (status === "resolved") {
      incident.resolvedAt = new Date();
      // Free up the responder
      if (incident.assignedResponderId) {
        const responder = await Responder.findOne({
          where: { responderId: incident.assignedResponderId },
        });
        if (responder) {
          responder.isAvailable = true;
          await responder.save();
        }
      }
    }

    await incident.save();
    return res
      .status(200)
      .json({ success: true, message: "Status updated.", data: incident });
  } catch (error) {
    console.error("Update status error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error." });
  }
};

/**
 * PUT /incidents/:id/assign
 * Manually assign a responder to an incident
 */
const assignResponder = async (req, res) => {
  try {
    const incident = await Incident.findOne({
      where: { incidentId: req.params.id },
    });
    if (!incident) {
      return res
        .status(404)
        .json({ success: false, message: "Incident not found." });
    }

    const responder = await Responder.findOne({
      where: { responderId: req.body.responderId },
    });
    if (!responder) {
      return res
        .status(404)
        .json({ success: false, message: "Responder not found." });
    }

    incident.assignedUnit = responder.name;
    incident.assignedResponderId = responder.responderId;
    incident.status = "dispatched";
    incident.dispatchedAt = new Date();
    await incident.save();

    responder.isAvailable = false;
    await responder.save();

    return res
      .status(200)
      .json({ success: true, message: "Responder assigned.", data: incident });
  } catch (error) {
    console.error("Assign responder error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error." });
  }
};

/**
 * POST /responders
 * Register a new responder (police station, fire station, ambulance)
 */
const createResponder = async (req, res) => {
  try {
    const { name, type, latitude, longitude, hospitalId, stationId } = req.body;
    const responder = await Responder.create({
      name,
      type,
      latitude,
      longitude,
      hospitalId,
      stationId,
    });
    return res
      .status(201)
      .json({
        success: true,
        message: "Responder registered.",
        data: responder,
      });
  } catch (error) {
    console.error("Create responder error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error." });
  }
};

/**
 * GET /responders
 * Get all responders
 */
const getResponders = async (req, res) => {
  try {
    const { type, isAvailable } = req.query;
    const where = {};
    if (type) where.type = type;
    if (isAvailable !== undefined) where.isAvailable = isAvailable === "true";
    const responders = await Responder.findAll({
      where,
      order: [["created_at", "DESC"]],
    });
    return res.status(200).json({ success: true, data: responders });
  } catch (error) {
    console.error("Get responders error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error." });
  }
};

module.exports = {
  createIncident,
  getOpenIncidents,
  getIncident,
  updateStatus,
  assignResponder,
  createResponder,
  getResponders,
};
