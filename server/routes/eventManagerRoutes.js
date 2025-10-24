// server/routes/eventManagerRoutes.js
const router = require("express").Router();
const { protect, requireRole } = require("../middleware/auth");
const mgr = require("../controllers/eventManagerController");

// All routes here are event manager only
router.use(protect, requireRole("eventmanager"));

// GET /api/eventmgr/event-bookings?from=&to=&eventId=&userId=&status=&paymentStatus=&page=&limit=
router.get("/event-bookings", mgr.listEventBookings);

// GET /api/eventmgr/entry-bookings?from=&to=&userId=&status=&paymentStatus=&page=&limit=
router.get("/entry-bookings", mgr.listEntryBookings);

module.exports = router;
