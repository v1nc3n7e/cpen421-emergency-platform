const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const Incident = sequelize.define(
  "Incident",
  {
    incidentId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: "incident_id",
    },
    citizenName: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "citizen_name",
    },
    incidentType: {
      type: DataTypes.ENUM(
        "robbery",
        "crime",
        "fire",
        "medical_emergency",
        "accident",
        "other",
      ),
      allowNull: false,
      field: "incident_type",
    },
    latitude: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    longitude: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    createdBy: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "created_by",
    },
    assignedUnit: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
      field: "assigned_unit",
    },
    assignedResponderId: {
      type: DataTypes.UUID,
      allowNull: true,
      defaultValue: null,
      field: "assigned_responder_id",
    },
    status: {
      type: DataTypes.ENUM("created", "dispatched", "in_progress", "resolved"),
      defaultValue: "created",
    },
    dispatchedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
      field: "dispatched_at",
    },
    resolvedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
      field: "resolved_at",
    },
  },
  {
    tableName: "incidents",
    timestamps: true,
    underscored: true,
  },
);

module.exports = Incident;
