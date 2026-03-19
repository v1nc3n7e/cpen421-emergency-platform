const { verifyAccessToken } = require("../utils/jwt");
const User = require("../models/User");

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ success: false, message: "Access denied. No token provided." });
    }
    const token = authHeader.split(" ")[1];
    const decoded = verifyAccessToken(token);
    const user = await User.findOne({
      where: { userId: decoded.sub, isActive: true },
    });
    if (!user) {
      return res
        .status(401)
        .json({
          success: false,
          message: "User no longer exists or account deactivated.",
        });
    }
    req.user = {
      userId: decoded.sub,
      email: decoded.email,
      role: decoded.role,
      name: decoded.name,
      stationId: decoded.stationId,
    };
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res
        .status(401)
        .json({
          success: false,
          message: "Token expired. Please refresh your token.",
        });
    }
    return res.status(401).json({ success: false, message: "Invalid token." });
  }
};

const authorize = (...roles) => {
  const allowedRoles = roles.flat();
  return (req, res, next) => {
    if (!req.user) {
      return res
        .status(401)
        .json({ success: false, message: "Not authenticated." });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res
        .status(403)
        .json({
          success: false,
          message: `Access denied. Required role(s): ${allowedRoles.join(", ")}.`,
        });
    }
    next();
  };
};

module.exports = { authenticate, authorize };
