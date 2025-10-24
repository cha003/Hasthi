// server/controllers/bookingController.js
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const Event = require("../models/Event");
const Booking = require("../models/Booking");

/* -------------------------- helpers -------------------------- */

async function issueTicketToken(booking) {
  const ev = await Event.findById(booking.event).lean();
  if (!ev) {
    const err = new Error("Event not found for booking");
    err.status = 404;
    throw err;
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const endSec = Math.floor(new Date(ev.end).getTime() / 1000);
  const ttl = Math.max(60 * 60, endSec + 60 * 60 * 24 * 30 - nowSec); // >= 1h; up to 30d after end

  const token = jwt.sign(
    { bid: String(booking._id), uid: String(booking.user), eid: String(booking.event) },
    process.env.JWT_SECRET,
    { expiresIn: ttl }
  );

  booking.ticketToken = token;
  booking.ticketIssuedAt = new Date();
  await booking.save();
  return token;
}

function isObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

/* -------------------------- create --------------------------- */
/**
 * POST /api/bookings  (user)
 * Reserve seats atomically and create a pending booking.
 */
async function createBooking(req, res, next) {
  try {
    const { eventId, tickets, attendeeName, phone, note } = req.body;

    // Basic validation
    const t = Number(tickets);
    if (!eventId || !isObjectId(eventId)) {
      return res.status(400).json({ message: "Valid eventId is required" });
    }
    if (!Number.isInteger(t) || t < 1) {
      return res.status(400).json({ message: "tickets must be a positive integer" });
    }
    if (!attendeeName || !phone) {
      return res.status(400).json({ message: "attendeeName and phone are required" });
    }
    if (!req.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Prevent duplicate active booking for the same user & event
    const existing = await Booking.findOne({
      user: req.user.id,
      event: eventId,
      status: "booked",
    }).lean();
    if (existing) {
      return res.status(409).json({
        message:
          "You already have a booking for this event. Edit or cancel it from My Bookings.",
      });
    }

    // Ensure event exists & is active; also repair old docs that lack remainingSeats
    const ev0 = await Event.findById(eventId).lean();
    if (!ev0) return res.status(404).json({ message: "Event not found" });
    if (ev0.status !== "active") {
      return res.status(400).json({ message: "Event is not active" });
    }

    // If remainingSeats is missing/undefined, initialize it to capacity
    if (ev0.remainingSeats == null) {
      try {
        await Event.updateOne(
          { _id: ev0._id, remainingSeats: { $exists: false } },
          { $set: { remainingSeats: ev0.capacity } }
        );
      } catch (e) {
        console.error("Failed to initialize remainingSeats:", e);
      }
    }

    // Atomically decrement remaining seats if enough remain
    const evt = await Event.findOneAndUpdate(
      { _id: eventId, status: "active", remainingSeats: { $gte: t } },
      { $inc: { remainingSeats: -t } },
      { new: true }
    );

    if (!evt) {
      return res
        .status(400)
        .json({ message: "Event unavailable or not enough seats" });
    }

    // Create booking; rollback seats if booking insert fails
    let booking;
    try {
      booking = await Booking.create({
        user: req.user.id,
        event: evt._id,
        tickets: t,
        attendeeName: String(attendeeName).trim(),
        phone: String(phone).trim(),
        note: note?.trim(),
        status: "booked",
        paymentStatus: "pending",
      });
    } catch (err) {
      // Rollback seats on failure
      try {
        await Event.findByIdAndUpdate(evt._id, { $inc: { remainingSeats: t } });
      } catch (rbErr) {
        console.error("Seat rollback failed:", rbErr);
      }

      if (err?.code === 11000) {
        // unique (user,event,status) index
        return res.status(409).json({
          message:
            "You already have a booking for this event. Edit or cancel it from My Bookings.",
        });
      }

      console.error("Booking.create failed:", err);
      return res.status(500).json({ message: "Booking failed" });
    }

    const populated = await Booking.findById(booking._id).populate("event");
    res.status(201).json(populated);
  } catch (e) {
    console.error("createBooking error:", e);
    next(e);
  }
}

/* ---------------------------- reads -------------------------- */

async function myBookings(req, res, next) {
  try {
    const list = await Booking.find({ user: req.user.id })
      .populate("event")
      .sort({ createdAt: -1 });
    res.json(list);
  } catch (e) {
    next(e);
  }
}

async function getBooking(req, res, next) {
  try {
    if (!isObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid booking id" });
    }
    const b = await Booking.findById(req.params.id).populate("event");
    if (!b) return res.status(404).json({ message: "Booking not found" });
    if (String(b.user) !== String(req.user.id) && req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }
    res.json(b);
  } catch (e) {
    next(e);
  }
}

/* ---------------------------- updates ------------------------ */

async function payBooking(req, res, next) {
  try {
    if (!isObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid booking id" });
    }
    const b = await Booking.findById(req.params.id);
    if (!b) return res.status(404).json({ message: "Booking not found" });
    if (String(b.user) !== String(req.user.id) && req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }
    if (b.status === "cancelled") {
      return res.status(400).json({ message: "Cannot pay a cancelled booking" });
    }

    b.paymentStatus = "paid";
    await b.save();
    if (!b.ticketToken) await issueTicketToken(b);

    const populated = await Booking.findById(b._id).populate("event");
    res.json(populated);
  } catch (e) {
    next(e);
  }
}

async function cancelBooking(req, res, next) {
  try {
    if (!isObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid booking id" });
    }
    const b = await Booking.findOne({ _id: req.params.id, user: req.user.id });
    if (!b) return res.status(404).json({ message: "Booking not found" });

    if (b.paymentStatus === "paid") {
      return res.status(400).json({ message: "Paid booking cannot be cancelled" });
    }
    if (b.status === "cancelled") {
      const populated = await Booking.findById(b._id).populate("event");
      return res.json(populated);
    }

    const ev = await Event.findById(b.event);
    if (!ev) return res.status(404).json({ message: "Event not found" });
    if (new Date(ev.start).getTime() <= Date.now()) {
      return res.status(400).json({ message: "Event already started. Cannot cancel." });
    }

    b.status = "cancelled";
    await b.save();
    await Event.findByIdAndUpdate(ev._id, { $inc: { remainingSeats: b.tickets } });

    const populated = await Booking.findById(b._id).populate("event");
    res.json(populated);
  } catch (e) {
    next(e);
  }
}

async function getTicketToken(req, res, next) {
  try {
    if (!isObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid booking id" });
    }
    const b = await Booking.findById(req.params.id);
    if (!b) return res.status(404).json({ message: "Booking not found" });
    if (String(b.user) !== String(req.user.id) && req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }

    if (b.status !== "booked" || b.paymentStatus !== "paid") {
      return res
        .status(400)
        .json({ message: "Ticket is not available (unpaid or cancelled)" });
    }
    if (!b.ticketToken) await issueTicketToken(b);

    res.json({ token: b.ticketToken });
  } catch (e) {
    next(e);
  }
}

/* ---------------------------- verify/resolve ----------------- */

async function verifyTicket(req, res, next) {
  try {
    const { token } = req.body || {};
    if (!token) return res.status(400).json({ message: "token is required" });

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    const { bid, uid, eid } = payload;
    if (!isObjectId(bid) || !isObjectId(uid) || !isObjectId(eid)) {
      return res.status(400).json({ message: "Malformed token payload" });
    }

    const b = await Booking.findById(bid).populate("event user", "title start end name email");
    if (!b) return res.status(404).json({ message: "Booking not found" });

    if (String(b.user?._id) !== String(uid) || String(b.event?._id) !== String(eid)) {
      return res.status(400).json({ message: "Token does not match booking" });
    }
    if (b.status !== "booked" || b.paymentStatus !== "paid") {
      return res.status(400).json({ message: "Booking is not valid for entry" });
    }

    res.json({
      valid: true,
      bookingId: b._id,
      user: { name: b.user?.name, email: b.user?.email },
      event: { title: b.event?.title, start: b.event?.start, end: b.event?.end },
      tickets: b.tickets,
    });
  } catch (e) {
    next(e);
  }
}

async function resolveTicketPublic(req, res, next) {
  try {
    const { token } = req.body || {};
    if (!token) return res.status(400).json({ message: "token is required" });

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    const { bid, uid, eid } = payload;
    if (!isObjectId(bid) || !isObjectId(uid) || !isObjectId(eid)) {
      return res.status(400).json({ message: "Malformed token payload" });
    }

    const b = await Booking.findById(bid)
      .populate("event user", "title start end venue price name email")
      .lean();

    if (!b) return res.status(404).json({ message: "Booking not found" });
    if (String(b.user?._id) !== String(uid) || String(b.event?._id) !== String(eid)) {
      return res.status(400).json({ message: "Token does not match booking" });
    }
    if (b.status !== "booked" || b.paymentStatus !== "paid") {
      return res.status(400).json({ message: "Booking is not valid for entry" });
    }

    res.json({
      bookingId: String(b._id),
      tickets: b.tickets,
      attendeeName: b.attendeeName,
      user: { name: b.user?.name, email: b.user?.email },
      event: {
        id: String(b.event?._id),
        title: b.event?.title,
        start: b.event?.start,
        end: b.event?.end,
        venue: b.event?.venue,
        price: b.event?.price,
      },
      token,
    });
  } catch (e) {
    next(e);
  }
}

module.exports = {
  createBooking,
  myBookings,
  getBooking,
  payBooking,
  cancelBooking,
  getTicketToken,
  verifyTicket,
  resolveTicketPublic,
};
