// server/routes/managerAnalyticsRoutes.js
const router = require("express").Router();
const { protect, requireRole } = require("../middleware/auth");
const { getManagerAnalytics } = require("../controllers/managerAnalyticsController");

// Managers & Admins only (NOT event manager)
router.get("/", protect, requireRole("manager", "admin"), getManagerAnalytics);

module.exports = router;
