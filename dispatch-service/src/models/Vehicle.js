const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const Vehicle = sequelize.define(
  "Vehicle",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    vehicleId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: "vehicle_id_unique",
      field: "vehicle_id",
      comment: "Human readable ID e.g. AMB-001, POL-003",
    },
    type: {
      type: DataTypes.ENUM("ambulance", "police", "fire"),
      allowNull: false,
    },
    stationId: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "station_id",
      comment: "Hospital/Police Station/Fire Service Station ID",
    },
    incidentServiceId: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
      field: "incident_service_id",
      comment: "ID of the incident this vehicle is currently responding to",
    },
    latitude: {
      type: DataTypes.FLOAT,
      allowNull: true,
      defaultValue: null,
    },
    longitude: {
      type: DataTypes.FLOAT,
      allowNull: true,
      defaultValue: null,
    },
    status: {
      type: DataTypes.ENUM("available", "dispatched", "returning"),
      defaultValue: "available",
    },
    lastUpdated: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
      field: "last_updated",
    },
    driverName: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
      field: "driver_name",
    },
  },
  {
    tableName: "vehicles",
    timestamps: true,
    underscored: true,
  },
);

module.exports = Vehicle;
