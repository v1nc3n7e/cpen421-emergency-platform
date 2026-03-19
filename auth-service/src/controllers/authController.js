const User = require("../models/User");
const { Op } = require("sequelize");
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  buildTokenPayload,
} = require("../utils/jwt");

const register = async (req, res) => {
  try {
    const { name, email, password, role, stationId } = req.body;
    const existing = await User.findOne({
      where: { email: email.toLowerCase() },
    });
    if (existing) {
      return res
        .status(409)
        .json({
          success: false,
          message: "A user with this email already exists.",
        });
    }
    const user = await User.create({
      name,
      email,
      role,
      passwordHash: password,
      stationId: stationId || null,
    });
    return res
      .status(201)
      .json({
        success: true,
        message: "User registered successfully.",
        data: user.toPublicJSON(),
      });
  } catch (error) {
    console.error("Register error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error." });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({
      where: { email: email.toLowerCase(), isActive: true },
    });
    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid email or password." });
    }
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid email or password." });
    }
    const payload = buildTokenPayload(user);
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);
    const tokens = [...(user.refreshTokens || []), refreshToken];
    user.refreshTokens = tokens.length > 5 ? tokens.slice(-5) : tokens;
    await user.save();
    return res.status(200).json({
      success: true,
      message: "Login successful.",
      data: {
        user: user.toPublicJSON(),
        accessToken,
        refreshToken,
        expiresIn: process.env.JWT_EXPIRES_IN || "15m",
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error." });
  }
};

const refreshToken = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;
    let decoded;
    try {
      decoded = verifyRefreshToken(token);
    } catch {
      return res
        .status(401)
        .json({ success: false, message: "Invalid or expired refresh token." });
    }
    const user = await User.findOne({
      where: { userId: decoded.sub, isActive: true },
    });
    if (!user || !user.refreshTokens.includes(token)) {
      return res
        .status(401)
        .json({
          success: false,
          message: "Refresh token has been revoked or is invalid.",
        });
    }
    user.refreshTokens = user.refreshTokens.filter((t) => t !== token);
    const payload = buildTokenPayload(user);
    const newAccessToken = generateAccessToken(payload);
    const newRefreshToken = generateRefreshToken(payload);
    user.refreshTokens = [...user.refreshTokens, newRefreshToken];
    await user.save();
    return res.status(200).json({
      success: true,
      message: "Token refreshed successfully.",
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresIn: process.env.JWT_EXPIRES_IN || "15m",
      },
    });
  } catch (error) {
    console.error("Refresh token error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error." });
  }
};

const getProfile = async (req, res) => {
  try {
    const user = await User.findOne({ where: { userId: req.user.userId } });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }
    return res.status(200).json({ success: true, data: user.toPublicJSON() });
  } catch (error) {
    console.error("Get profile error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error." });
  }
};

const logout = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) {
      return res
        .status(400)
        .json({ success: false, message: "Refresh token required." });
    }
    const user = await User.findOne({ where: { userId: req.user.userId } });
    if (user) {
      user.refreshTokens = user.refreshTokens.filter((t) => t !== token);
      await user.save();
    }
    return res
      .status(200)
      .json({ success: true, message: "Logged out successfully." });
  } catch (error) {
    console.error("Logout error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error." });
  }
};

const listUsers = async (req, res) => {
  try {
    const { role, isActive, page = 1, limit = 20 } = req.query;
    const where = {};
    if (role) where.role = role;
    if (isActive !== undefined) where.isActive = isActive === "true";
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { rows: users, count: total } = await User.findAndCountAll({
      where,
      offset,
      limit: parseInt(limit),
      order: [["createdDate", "DESC"]],
    });
    return res.status(200).json({
      success: true,
      data: {
        users: users.map((u) => u.toPublicJSON()),
        pagination: { total, page: parseInt(page), limit: parseInt(limit) },
      },
    });
  } catch (error) {
    console.error("List users error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error." });
  }
};

const verifyToken = async (req, res) => {
  return res.status(200).json({ success: true, data: req.user });
};

module.exports = {
  register,
  login,
  refreshToken,
  getProfile,
  logout,
  listUsers,
  verifyToken,
};
