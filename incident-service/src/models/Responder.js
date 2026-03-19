const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const Responder = sequelize.define(
  "Responder",
  {
    responderId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: "responder_id",
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM("police", "fire", "ambulance"),
      allowNull: false,
    },
    latitude: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    longitude: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    isAvailable: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: "is_available",
    },
    hospitalId: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
      field: "hospital_id",
    },
    stationId: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
      field: "station_id",
    },
  },
  {
    tableName: "responders",
    timestamps: true,
    underscored: true,
  },
);

module.exports = Responder;
