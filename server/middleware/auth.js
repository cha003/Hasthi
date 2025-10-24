// server/middleware/auth.js
const jwt = require("jsonwebtoken");

function sendAuthError(res, code = 401, msg = "Not authorized") {
  return res.status(code).json({ message: msg });
}

function protect(req, res, next) {
  try {
    const token =
      req.cookies?.token ||
      (req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.split(" ")[1]
        : null);

    if (!token) return sendAuthError(res);

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: decoded.id, role: decoded.role };
    next();
  } catch (e) {
    return sendAuthError(res);
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return sendAuthError(res, 403, "Forbidden");
    }
    next();
  };
}

module.exports = { protect, requireRole };
