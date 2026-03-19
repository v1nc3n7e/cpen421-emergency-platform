const { Sequelize } = require("sequelize");

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: "postgres",
  logging: process.env.NODE_ENV === "development" ? console.log : false,
  dialectOptions:
    process.env.NODE_ENV === "production"
      ? { ssl: { require: true, rejectUnauthorized: false } }
      : {},
});

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log("PostgreSQL Connected successfully.");
    await sequelize.sync({ alter: true });
    console.log("Database tables synced.");
  } catch (error) {
    console.error("PostgreSQL Connection Error:", error.message);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };
