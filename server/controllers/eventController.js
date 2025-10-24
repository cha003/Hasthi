const Event = require("../models/Event");
const Booking = require("../models/Booking");

// POST /api/events (eventmanager)
async function createEvent(req, res, next) {
  try {
    const { title, description, venue, start, end, capacity, status = "active", price = 0 } = req.body;
    if (!title || !start || !end || !capacity) {
      return res.status(400).json({ message: "title, start, end, capacity are required" });
    }
    if (new Date(start) >= new Date(end)) {
      return res.status(400).json({ message: "start must be before end" });
    }

    const ev = await Event.create({
      title: title.trim(),
      description: description?.trim(),
      venue: venue?.trim(),
      start,
      end,
      capacity: Number(capacity),
      remainingSeats: Number(capacity),
      status,
      price: Number(price) || 0
    });

    res.status(201).json(ev);
  } catch (e) { next(e); }
}

// GET /api/events (public or manager) — ?includeBookingStats=1
async function listEvents(req, res, next) {
  try {
    const events = await Event.find({}).sort({ start: 1 }).lean();

    const wantStats =
      req.query.includeBookingStats === "1" ||
      req.query.includeBookingStats === "true";

    if (!wantStats || events.length === 0) {
      return res.json(events);
    }

    const ids = events.map(e => e._id);
    const agg = await Booking.aggregate([
      { $match: { event: { $in: ids }, status: "booked" } },
      {
        $group: {
          _id: "$event",
          ticketsTotal: { $sum: "$tickets" },
          paid: { $sum: { $cond: [{ $eq: ["$paymentStatus", "paid"] }, "$tickets", 0] } },
          pending: { $sum: { $cond: [{ $eq: ["$paymentStatus", "pending"] }, "$tickets", 0] } }
        }
      }
    ]);

    const statsByEvent = new Map(agg.map(x => [String(x._id), x]));
    const withStats = events.map(e => {
      const stat = statsByEvent.get(String(e._id));
      return {
        ...e,
        stats: stat
          ? { ticketsTotal: stat.ticketsTotal, paid: stat.paid, pending: stat.pending }
          : { ticketsTotal: 0, paid: 0, pending: 0 }
      };
    });

    res.json(withStats);
  } catch (e) { next(e); }
}

// GET /api/events/:id (public)
async function getEvent(req, res, next) {
  try {
    const ev = await Event.findById(req.params.id);
    if (!ev) return res.status(404).json({ message: "Event not found" });
    res.json(ev);
  } catch (e) { next(e); }
}

// PUT /api/events/:id (eventmanager)
async function updateEvent(req, res, next) {
  try {
    const id = req.params.id;
    const prev = await Event.findById(id);
    if (!prev) return res.status(404).json({ message: "Event not found" });

    const { title, description, venue, start, end, capacity, status, price } = req.body;

    const update = {};
    if (title !== undefined) update.title = String(title).trim();
    if (description !== undefined) update.description = String(description).trim();
    if (venue !== undefined) update.venue = String(venue).trim();
    if (start !== undefined) update.start = start;
    if (end !== undefined) update.end = end;
    if (status !== undefined) update.status = status;
    if (price !== undefined) update.price = Number(price) || 0;

    if (update.start && update.end && new Date(update.start) >= new Date(update.end)) {
      return res.status(400).json({ message: "start must be before end" });
    }

    if (capacity != null) {
      const newCap = Number(capacity);
      if (!Number.isFinite(newCap) || newCap < 1) {
        return res.status(400).json({ message: "capacity must be >= 1" });
      }
      const delta = newCap - prev.capacity;
      update.capacity = newCap;
      update.remainingSeats = Math.max(0, prev.remainingSeats + delta);
    }

    const ev = await Event.findByIdAndUpdate(id, update, { new: true });
    res.json(ev);
  } catch (e) { next(e); }
}

// PATCH /api/events/:id/cancel (eventmanager)
async function cancelEvent(req, res, next) {
  try {
    const ev = await Event.findByIdAndUpdate(req.params.id, { status: "cancelled" }, { new: true });
    if (!ev) return res.status(404).json({ message: "Event not found" });
    res.json(ev);
  } catch (e) { next(e); }
}

// GET /api/events/:id/bookings (eventmanager)
async function getEventBookings(req, res, next) {
  try {
    const eventId = req.params.id;
    const exists = await Event.exists({ _id: eventId });
    if (!exists) return res.status(404).json({ message: "Event not found" });

    const rows = await Booking.find({ event: eventId })
      .populate("user", "name email")
      .sort({ createdAt: -1 })
      .lean();

    res.json(rows);
  } catch (e) { next(e); }
}

// DELETE /api/events/:id (eventmanager) — only if no active bookings
async function deleteEvent(req, res, next) {
  try {
    const id = req.params.id;

    const hasBookings = await Booking.exists({ event: id, status: "booked" });
    if (hasBookings) {
      return res.status(400).json({ message: "Cannot delete: this event already has bookings" });
    }

    const ev = await Event.findByIdAndDelete(id);
    if (!ev) return res.status(404).json({ message: "Event not found" });

    res.json({ message: "Event deleted" });
  } catch (e) { next(e); }
}

module.exports = {
  createEvent,
  listEvents,
  getEvent,
  updateEvent,
  cancelEvent,
  getEventBookings,
  deleteEvent,
};
