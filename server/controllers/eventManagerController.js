// server/controllers/eventManagerController.js
const Booking = require("../models/Booking");
const EntryBooking = require("../models/EntryBooking");

function parsePaging(query) {
  const page = Math.max(1, parseInt(query.page || "1", 10));
  const limit = Math.min(200, Math.max(1, parseInt(query.limit || "50", 10)));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

function dateRange(query) {
  const { from, to } = query || {};
  const r = {};
  if (from || to) {
    r.createdAt = {};
    if (from) r.createdAt.$gte = new Date(from);
    if (to) r.createdAt.$lte = new Date(to);
  }
  return r;
}

/**
 * GET /api/eventmgr/event-bookings
 * Query: from,to,eventId,userId,status,paymentStatus,page,limit
 */
exports.listEventBookings = async (req, res, next) => {
  try {
    const { eventId, userId, status, paymentStatus } = req.query || {};
    const where = { ...dateRange(req.query) };
    if (eventId) where.event = eventId;
    if (userId) where.user = userId;
    if (status) where.status = status;
    if (paymentStatus) where.paymentStatus = paymentStatus;

    const { page, limit, skip } = parsePaging(req.query);

    const [items, total] = await Promise.all([
      Booking.find(where)
        .populate("user", "name email")
        .populate("event", "title start end venue price")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Booking.countDocuments(where),
    ]);

    res.json({ items, total, page, limit });
  } catch (e) {
    next(e);
  }
};

/**
 * GET /api/eventmgr/entry-bookings
 * Query: from,to,userId,status,paymentStatus,page,limit
 */
exports.listEntryBookings = async (req, res, next) => {
  try {
    const { userId, status, paymentStatus } = req.query || {};
    const where = { ...dateRange(req.query) };
    if (userId) where.user = userId;
    if (status) where.status = status;
    if (paymentStatus) where.paymentStatus = paymentStatus;

    const { page, limit, skip } = parsePaging(req.query);

    const [items, total] = await Promise.all([
      EntryBooking.find(where)
        .populate("user", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      EntryBooking.countDocuments(where),
    ]);

    res.json({ items, total, page, limit });
  } catch (e) {
    next(e);
  }
};
