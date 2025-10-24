// server/routes/eventAnalyticsRoutes.js
const router = require("express").Router();
const { getEventAnalytics } = require("../controllers/eventAnalyticsController");
// If you want: const { protect, requireRole } = require("../middleware/auth");
// router.get("/", protect, requireRole("eventmanager", "admin"), getEventAnalytics);

router.get("/", getEventAnalytics);

module.exports = router;
