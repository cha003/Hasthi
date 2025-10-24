const router = require("express").Router();
const { protect, requireRole } = require("../middleware/auth");
const ctrl = require("../controllers/eventController");

/**
 * PUBLIC
 */
router.get("/", ctrl.listEvents);          // list (optionally with ?includeBookingStats=1)
router.get("/:id", ctrl.getEvent);         // read single

/**
 * EVENT MANAGER ONLY
 * (Put these BEFORE generic "/:id" update routes so "/manage" doesn't get captured.)
 */
router.get("/manage/list", protect, requireRole("eventmanager"), ctrl.listEvents);
router.get("/:id/bookings", protect, requireRole("eventmanager"), ctrl.getEventBookings);

router.post("/", protect, requireRole("eventmanager"), ctrl.createEvent);
router.put("/:id", protect, requireRole("eventmanager"), ctrl.updateEvent);
router.patch("/:id/cancel", protect, requireRole("eventmanager"), ctrl.cancelEvent);
router.delete("/:id", protect, requireRole("eventmanager"), ctrl.deleteEvent);

module.exports = router;
