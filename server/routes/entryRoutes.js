const router = require("express").Router();
const { protect, requireRole } = require("../middleware/auth");
const c = require("../controllers/entryController");

/**
 * Admin inventory
 */
router.post("/inventory", protect, requireRole("admin"), c.upsertInventory);
router.get("/inventory", c.listInventory); // public read (optional)

/**
 * Event Manager: list ALL entry bookings
 * (place BEFORE "/bookings/:id" to avoid shadowing)
 */
router.get("/bookings/manage", protect, requireRole("eventmanager"), c.listAllEntryBookingsForManager);

/**
 * User bookings
 */
router.post("/bookings", protect, c.createEntryBooking);
router.get("/bookings/me", protect, c.myEntryBookings);
router.get("/bookings/:id", protect, c.getEntryBooking);
router.patch("/bookings/:id/pay", protect, c.payEntryBooking);
router.patch("/bookings/:id/cancel", protect, c.cancelEntryBooking);
router.get("/bookings/:id/ticket-token", protect, c.getEntryTicketToken);

/**
 * Staff verify (allow eventmanager too)
 */
router.post("/bookings/verify", protect, requireRole("admin", "caretaker", "eventmanager"), c.verifyEntryTicket);

/**
 * Public scan resolver
 */
router.post("/bookings/resolve", c.resolveEntryTicketPublic);

module.exports = router;
