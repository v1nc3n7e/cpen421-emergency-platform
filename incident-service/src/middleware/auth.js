const jwt = require("jsonwebtoken");

const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ success: false, message: "Access denied. No token provided." });
    }
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
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
        .json({ success: false, message: "Token expired." });
    }
    return res.status(401).json({ success: false, message: "Invalid token." });
  }
};

const authorize = (...roles) => {
  const allowedRoles = roles.flat();
  return (req, res, next) => {
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
