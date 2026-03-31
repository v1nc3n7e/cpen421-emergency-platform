const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const VehicleLocationHistory = sequelize.define(
  "VehicleLocationHistory",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    vehicleId: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "vehicle_id",
    },
    latitude: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    longitude: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    recordedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: "recorded_at",
    },
  },
  {
    tableName: "vehicle_location_history",
    timestamps: false,
    underscored: true,
  },
);

module.exports = VehicleLocationHistory;
