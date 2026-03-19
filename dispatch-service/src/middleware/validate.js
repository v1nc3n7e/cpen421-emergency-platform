const { body, validationResult } = require("express-validator");

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: "Validation failed",
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

const registerVehicleRules = [
  body("vehicleId").trim().notEmpty().withMessage("Vehicle ID is required"),
  body("type")
    .isIn(["ambulance", "police", "fire"])
    .withMessage("Type must be ambulance, police, or fire"),
  body("stationId").trim().notEmpty().withMessage("Station ID is required"),
];

const locationRules = [
  body("latitude")
    .isFloat({ min: -90, max: 90 })
    .withMessage("Valid latitude is required"),
  body("longitude")
    .isFloat({ min: -180, max: 180 })
    .withMessage("Valid longitude is required"),
];

module.exports = { validate, registerVehicleRules, locationRules };
