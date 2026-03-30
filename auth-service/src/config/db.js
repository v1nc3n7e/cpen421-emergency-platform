const { Sequelize } = require("sequelize");

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: "postgres",
  logging: false,
  dialectOptions:
    process.env.NODE_ENV === "production"
      ? { ssl: { require: true, rejectUnauthorized: false } }
      : {},
});

const seedAdmin = async () => {
  try {
    const User = require("../models/User");
    const existing = await User.findOne({
      where: { email: "Group29@emergency.gov.gh" },
    });
    if (!existing) {
      await User.create({
        userId: require("uuid").v4(),
        name: "System Administrator",
        email: "Group29@emergency.gov.gh",
        passwordHash: "Group29000",
        role: "system_admin",
        stationId: null,
      });
      console.log("Default admin user created.");
      console.log("Email: youremail@example.com");
      console.log("Password: YourPassword1");
    }
  } catch (error) {
    console.error("Seed error:", error.message);
  }
};

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log("PostgreSQL Connected successfully.");
    await sequelize.sync({ alter: true });
    console.log("Database tables synced.");
    await seedAdmin();
  } catch (error) {
    console.error("PostgreSQL Connection Error:", error.message);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };
