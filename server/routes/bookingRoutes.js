const router = require("express").Router();
const { protect } = require("../middleware/auth");
const {
  createBooking,
  myBookings,
  getBooking,
  payBooking,
  cancelBooking,
  getTicketToken,
  verifyTicket,
  resolveTicketPublic,
} = require("../controllers/bookingController");

// Local helper that accepts multiple roles
const allowRoles = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: "Unauthorized" });
  if (roles.includes(req.user.role)) return next();
  return res.status(403).json({ message: "Forbidden" });
};

// User-facing bookings
router.post("/", protect, createBooking);
router.get("/me", protect, myBookings);
router.get("/:id", protect, getBooking);
router.patch("/:id/pay", protect, payBooking);
router.patch("/:id/cancel", protect, cancelBooking);
router.get("/:id/ticket-token", protect, getTicketToken);

// Staff verify (admin / caretaker / eventmanager)
router.post("/verify", protect, allowRoles("admin", "caretaker", "eventmanager"), verifyTicket);

// Public scan resolver (no auth)
router.post("/resolve", resolveTicketPublic);

module.exports = router;
