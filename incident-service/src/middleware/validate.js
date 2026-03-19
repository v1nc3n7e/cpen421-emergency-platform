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

const incidentRules = [
  body("citizenName").trim().notEmpty().withMessage("Citizen name is required"),
  body("incidentType")
    .isIn([
      "robbery",
      "crime",
      "fire",
      "medical_emergency",
      "accident",
      "other",
    ])
    .withMessage("Invalid incident type"),
  body("latitude")
    .isFloat({ min: -90, max: 90 })
    .withMessage("Valid latitude is required"),
  body("longitude")
    .isFloat({ min: -180, max: 180 })
    .withMessage("Valid longitude is required"),
  body("notes").optional().isString(),
];

const statusRules = [
  body("status")
    .isIn(["created", "dispatched", "in_progress", "resolved"])
    .withMessage("Invalid status"),
];

const responderRules = [
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("type")
    .isIn(["police", "fire", "ambulance"])
    .withMessage("Type must be police, fire, or ambulance"),
  body("latitude")
    .isFloat({ min: -90, max: 90 })
    .withMessage("Valid latitude is required"),
  body("longitude")
    .isFloat({ min: -180, max: 180 })
    .withMessage("Valid longitude is required"),
  body("hospitalId").optional().isString(),
];

module.exports = { validate, incidentRules, statusRules, responderRules };
