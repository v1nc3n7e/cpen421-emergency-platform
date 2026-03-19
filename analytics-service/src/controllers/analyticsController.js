const { incidentPool, dispatchPool } = require("../config/db");

/**
 * GET /analytics/response-times
 * Average time between incident creation and dispatch
 */
const getResponseTimes = async (req, res) => {
  try {
    const result = await incidentPool.query(`
      SELECT
        incident_type,
        COUNT(*) AS total_incidents,
        ROUND(AVG(EXTRACT(EPOCH FROM (dispatched_at - created_at)) / 60)::numeric, 2) AS avg_response_time_minutes,
        ROUND(MIN(EXTRACT(EPOCH FROM (dispatched_at - created_at)) / 60)::numeric, 2) AS min_response_time_minutes,
        ROUND(MAX(EXTRACT(EPOCH FROM (dispatched_at - created_at)) / 60)::numeric, 2) AS max_response_time_minutes
      FROM incidents
      WHERE dispatched_at IS NOT NULL
      GROUP BY incident_type
      ORDER BY avg_response_time_minutes ASC
    `);

    const overall = await incidentPool.query(`
      SELECT
        COUNT(*) AS total_incidents,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END) AS resolved,
        COUNT(CASE WHEN status = 'dispatched' THEN 1 END) AS dispatched,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) AS in_progress,
        COUNT(CASE WHEN status = 'created' THEN 1 END) AS pending,
        ROUND(AVG(EXTRACT(EPOCH FROM (dispatched_at - created_at)) / 60)::numeric, 2) AS overall_avg_response_minutes
      FROM incidents
      WHERE dispatched_at IS NOT NULL
    `);

    return res.status(200).json({
      success: true,
      data: {
        overall: overall.rows[0],
        byIncidentType: result.rows,
      },
    });
  } catch (error) {
    console.error("Response times error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error." });
  }
};

/**
 * GET /analytics/incidents-by-region
 * Number of incidents grouped by type
 */
const getIncidentsByRegion = async (req, res) => {
  try {
    const byType = await incidentPool.query(`
      SELECT
        incident_type,
        COUNT(*) AS total,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END) AS resolved,
        COUNT(CASE WHEN status != 'resolved' THEN 1 END) AS open
      FROM incidents
      GROUP BY incident_type
      ORDER BY total DESC
    `);

    const byStatus = await incidentPool.query(`
      SELECT
        status,
        COUNT(*) AS total
      FROM incidents
      GROUP BY status
      ORDER BY total DESC
    `);

    const recent = await incidentPool.query(`
      SELECT
        incident_id,
        citizen_name,
        incident_type,
        status,
        latitude,
        longitude,
        created_at
      FROM incidents
      ORDER BY created_at DESC
      LIMIT 10
    `);

    return res.status(200).json({
      success: true,
      data: {
        byIncidentType: byType.rows,
        byStatus: byStatus.rows,
        recentIncidents: recent.rows,
      },
    });
  } catch (error) {
    console.error("Incidents by region error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error." });
  }
};

/**
 * GET /analytics/resource-utilization
 * How responders and vehicles are being used
 */
const getResourceUtilization = async (req, res) => {
  try {
    const responders = await incidentPool.query(`
      SELECT
        type,
        COUNT(*) AS total,
        COUNT(CASE WHEN is_available = true THEN 1 END) AS available,
        COUNT(CASE WHEN is_available = false THEN 1 END) AS deployed
      FROM responders
      GROUP BY type
      ORDER BY type
    `);

    const topResponders = await incidentPool.query(`
      SELECT
        assigned_unit,
        COUNT(*) AS times_deployed
      FROM incidents
      WHERE assigned_unit IS NOT NULL
      GROUP BY assigned_unit
      ORDER BY times_deployed DESC
      LIMIT 10
    `);

    const vehicles = await dispatchPool.query(`
      SELECT
        type,
        COUNT(*) AS total,
        COUNT(CASE WHEN status = 'available' THEN 1 END) AS available,
        COUNT(CASE WHEN status = 'dispatched' THEN 1 END) AS dispatched,
        COUNT(CASE WHEN status = 'returning' THEN 1 END) AS returning
      FROM vehicles
      GROUP BY type
      ORDER BY type
    `);

    const vehicleList = await dispatchPool.query(`
      SELECT
        vehicle_id,
        type,
        status,
        driver_name,
        last_updated
      FROM vehicles
      ORDER BY last_updated DESC NULLS LAST
    `);

    return res.status(200).json({
      success: true,
      data: {
        responderUtilization: responders.rows,
        topDeployedResponders: topResponders.rows,
        vehicleUtilization: vehicles.rows,
        vehicles: vehicleList.rows,
      },
    });
  } catch (error) {
    console.error("Resource utilization error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error." });
  }
};

module.exports = {
  getResponseTimes,
  getIncidentsByRegion,
  getResourceUtilization,
};
