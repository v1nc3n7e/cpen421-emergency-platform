const express = require("express");
const router = express.Router();
const {
  register,
  login,
  refreshToken,
  getProfile,
  logout,
  listUsers,
  verifyToken,
} = require("../controllers/authController");
const { authenticate, authorize } = require("../middleware/auth");
const {
  validate,
  registerRules,
  loginRules,
  refreshTokenRules,
} = require("../middleware/validate");

router.post("/register", registerRules, validate, register);
router.post("/login", loginRules, validate, login);
router.post("/refresh-token", refreshTokenRules, validate, refreshToken);
router.get("/profile", authenticate, getProfile);
router.post("/logout", authenticate, logout);
router.get("/users", authenticate, authorize("system_admin"), listUsers);
router.post("/verify-token", authenticate, verifyToken);

module.exports = router;
