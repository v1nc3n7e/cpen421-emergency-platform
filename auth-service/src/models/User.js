const { DataTypes } = require("sequelize");
const bcrypt = require("bcryptjs");
const { sequelize } = require("../config/db");

const VALID_ROLES = [
  "system_admin",
  "hospital_admin",
  "police_admin",
  "fire_service_admin",
];

const User = sequelize.define(
  "User",
  {
    userId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: "user_id",
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      set(value) {
        this.setDataValue("email", value.toLowerCase().trim());
      },
    },
    role: {
      type: DataTypes.ENUM(...VALID_ROLES),
      allowNull: false,
    },
    passwordHash: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "password_hash",
    },
    stationId: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
      field: "station_id",
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: "is_active",
    },
    refreshTokens: {
      type: DataTypes.JSONB,
      defaultValue: [],
      field: "refresh_tokens",
    },
    createdDate: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: "created_date",
    },
  },
  {
    tableName: "users",
    timestamps: true,
    underscored: true,
  },
);

User.beforeCreate(async (user) => {
  const salt = await bcrypt.genSalt(12);
  user.passwordHash = await bcrypt.hash(user.passwordHash, salt);
});

User.beforeUpdate(async (user) => {
  if (user.changed("passwordHash")) {
    const salt = await bcrypt.genSalt(12);
    user.passwordHash = await bcrypt.hash(user.passwordHash, salt);
  }
});

User.prototype.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

User.prototype.toPublicJSON = function () {
  return {
    userId: this.userId,
    name: this.name,
    email: this.email,
    role: this.role,
    stationId: this.stationId,
    isActive: this.isActive,
    createdDate: this.createdDate,
  };
};

module.exports = User;
