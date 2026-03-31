const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const Hospital = sequelize.define(
  "Hospital",
  {
    hospitalId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: "hospital_id",
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    stationId: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
      field: "station_id",
    },
    latitude: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    longitude: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    totalBeds: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "total_beds",
    },
    availableBeds: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "available_beds",
    },
  },
  {
    tableName: "hospitals",
    timestamps: true,
    underscored: true,
  },
);

module.exports = Hospital;
