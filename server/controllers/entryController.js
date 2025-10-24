// server/controllers/entryController.js
const jwt = require("jsonwebtoken");
const EntryInventory = require("../models/EntryInventory");
const EntryBooking = require("../models/EntryBooking");

// Legacy server-side price table (kept for backwards-compat)
const PRICE = {
  adult: Number(process.env.ENTRY_PRICE_ADULT || 1500),
  child: Number(process.env.ENTRY_PRICE_CHILD || 800)
};

// NEW: Local vs Foreign base price per ticket (overrides unit prices)
const VISITOR_PRICE = {
  local: Number(process.env.ENTRY_PRICE_LOCAL || 1500),
  foreign: Number(process.env.ENTRY_PRICE_FOREIGN || 5000)
};

// normalize date to UTC midnight
function toDayUTC(d) {
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return null;
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

/* ---------- Admin inventory (optional) ---------- */
async function upsertInventory(req, res, next) {
  try {
    const { day, capacity, price } = req.body;
    const d = toDayUTC(day);
    if (!d || !Number.isFinite(Number(capacity)) || Number(capacity) < 0) {
      return res.status(400).json({ message: "day and non-negative capacity are required" });
    }
    const p = Number(price ?? 0);
    const existing = await EntryInventory.findOne({ day: d });
    let doc;
    if (!existing) {
      doc = await EntryInventory.create({
        day: d, capacity: Number(capacity), remaining: Number(capacity), price: p
      });
    } else {
      const delta = Number(capacity) - existing.capacity;
      doc = await EntryInventory.findOneAndUpdate(
        { day: d },
        { $set: { capacity: Number(capacity), price: p }, $inc: { remaining: delta } },
        { new: true }
      );
      if (doc.remaining < 0) { doc.remaining = 0; await doc.save(); }
    }
    res.status(201).json(doc);
  } catch (e) { next(e); }
}

async function listInventory(req, res, next) {
  try {
    const from = req.query.from ? toDayUTC(req.query.from) : null;
    const to = req.query.to ? toDayUTC(req.query.to) : null;
    const q = {};
    if (from || to) {
      q.day = {};
      if (from) q.day.$gte = from;
      if (to) q.day.$lte = to;
    }
    const rows = await EntryInventory.find(q).sort({ day: 1 }).lean();
    res.json(rows);
  } catch (e) { next(e); }
}

/* ---------- Ticket token helpers ---------- */
async function issueTicketToken(booking) {
  const token = jwt.sign(
    { kind: "entry", bid: String(booking._id), uid: String(booking.user), day: booking.day.getTime() },
    process.env.JWT_SECRET,
    { expiresIn: 60 * 60 * 24 * 7 } // 7 days
  );
  booking.ticketToken = token;
  booking.ticketIssuedAt = new Date();
  await booking.save();
  return token;
}

/* ---------- User bookings ---------- */
async function createEntryBooking(req, res, next) {
  try {
    const { day, items: rawItems, attendeeName, phone, note, timeSlot, visitorType: rawVisitorType } = req.body;

    const d = toDayUTC(day);
    if (!d) return res.status(400).json({ message: "Valid day is required" });
    if (!attendeeName || !phone) {
      return res.status(400).json({ message: "attendeeName and phone are required" });
    }

    // Visitor type (NEW)
    const visitorType = (String(rawVisitorType || "local").toLowerCase() === "foreign") ? "foreign" : "local";
    const baseUnitPrice = VISITOR_PRICE[visitorType]; // 1500 or 5000

    // only accept adult/child; ignore others
    const cleaned = Array.isArray(rawItems) ? rawItems : [];
    const filtered = cleaned
      .map(x => ({ type: String(x.type || "").toLowerCase(), qty: Number(x.qty) }))
      .filter(x => (x.type === "adult" || x.type === "child") && x.qty > 0);

    if (filtered.length === 0) {
      return res.status(400).json({ message: "Select adult or child tickets with qty > 0" });
    }

    // IMPORTANT: override unit price by visitorType for all items
    const items = filtered.map(x => ({ type: x.type, qty: x.qty, unitPrice: baseUnitPrice }));
    const tickets = items.reduce((s, it) => s + it.qty, 0);
    const total = tickets * baseUnitPrice;
    const currency = (process.env.STRIPE_CURRENCY || "usd").toLowerCase();

    // Optional capacity: if inventory exists, respect it. If not, unlimited.
    const inv = await EntryInventory.findOne({ day: d });
    if (inv) {
      if (inv.remaining < tickets) {
        return res.status(400).json({ message: "Not enough remaining capacity for this day" });
      }
      await EntryInventory.updateOne({ _id: inv._id }, { $inc: { remaining: -tickets } });
    }

    const booking = await EntryBooking.create({
      user: req.user.id,
      day: d,
      timeSlot: timeSlot?.trim(),
      visitorType,
      tickets,
      items,
      total,
      currency,
      attendeeName: attendeeName.trim(),
      phone: phone.trim(),
      note: note?.trim(),
      status: "booked",
      paymentStatus: "pending"
    });

    res.status(201).json(booking);
  } catch (e) { next(e); }
}

async function myEntryBookings(req, res, next) {
  try {
    const list = await EntryBooking.find({ user: req.user.id }).sort({ createdAt: -1 }).lean();
    res.json(list);
  } catch (e) { next(e); }
}

async function getEntryBooking(req, res, next) {
  try {
    const b = await EntryBooking.findById(req.params.id).lean();
    if (!b) return res.status(404).json({ message: "Booking not found" });
    if (String(b.user) !== String(req.user.id) && req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }
    res.json(b);
  } catch (e) { next(e); }
}

async function payEntryBooking(req, res, next) {
  try {
    const b = await EntryBooking.findById(req.params.id);
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
    const refreshed = await EntryBooking.findById(b._id).lean();
    res.json(refreshed);
  } catch (e) { next(e); }
}

async function cancelEntryBooking(req, res, next) {
  try {
    const b = await EntryBooking.findOne({ _id: req.params.id, user: req.user.id });
    if (!b) return res.status(404).json({ message: "Booking not found" });

    if (b.paymentStatus === "paid") {
      return res.status(400).json({ message: "Paid booking cannot be cancelled" });
    }
    if (b.status === "cancelled") return res.json(b);

    // block late cancellations for today or earlier
    const today = toDayUTC(new Date());
    if (b.day.getTime() <= today.getTime()) {
      return res.status(400).json({ message: "Too late to cancel for this day" });
    }

    b.status = "cancelled";
    await b.save();

    // restore inventory only if a document exists
    await EntryInventory.updateOne({ day: b.day }, { $inc: { remaining: b.tickets } }).catch(() => {});

    const refreshed = await EntryBooking.findById(b._id).lean();
    res.json(refreshed);
  } catch (e) { next(e); }
}

async function getEntryTicketToken(req, res, next) {
  try {
    const b = await EntryBooking.findById(req.params.id);
    if (!b) return res.status(404).json({ message: "Booking not found" });
    if (String(b.user) !== String(req.user.id) && req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }
    if (b.status !== "booked" || b.paymentStatus !== "paid") {
      return res.status(400).json({ message: "Ticket is not available (unpaid or cancelled)" });
    }
    if (!b.ticketToken) await issueTicketToken(b);
    res.json({ token: b.ticketToken });
  } catch (e) { next(e); }
}

async function verifyEntryTicket(req, res, next) {
  try {
    const { token } = req.body || {};
    if (!token) return res.status(400).json({ message: "token is required" });

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(400).json({ message: "Invalid or expired token" });
    }
    if (payload.kind !== "entry") return res.status(400).json({ message: "Wrong ticket type" });

    const b = await EntryBooking.findById(payload.bid).populate("user", "name email");
    if (!b) return res.status(404).json({ message: "Booking not found" });
    if (String(b.user?._id) !== String(payload.uid)) {
      return res.status(400).json({ message: "Token does not match booking" });
    }
    if (b.status !== "booked" || b.paymentStatus !== "paid") {
      return res.status(400).json({ message: "Booking is not valid for entry" });
    }

    res.json({
      valid: true,
      bookingId: b._id,
      user: { name: b.user?.name, email: b.user?.email },
      day: b.day,
      tickets: b.tickets,
      items: b.items,
      total: b.total,
      visitorType: b.visitorType
    });
  } catch (e) { next(e); }
}

async function resolveEntryTicketPublic(req, res, next) {
  try {
    const { token } = req.body || {};
    if (!token) return res.status(400).json({ message: "token is required" });

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(400).json({ message: "Invalid or expired token" });
    }
    if (payload.kind !== "entry") return res.status(400).json({ message: "Wrong ticket type" });

    const b = await EntryBooking.findById(payload.bid).populate("user", "name email").lean();
    if (!b) return res.status(404).json({ message: "Booking not found" });
    if (String(b.user?._id) !== String(payload.uid)) {
      return res.status(400).json({ message: "Token does not match booking" });
    }
    if (b.status !== "booked" || b.paymentStatus !== "paid") {
      return res.status(400).json({ message: "Booking is not valid for entry" });
    }

    res.json({
      bookingId: String(b._id),
      day: b.day,
      tickets: b.tickets,
      items: b.items,
      total: b.total,
      visitorType: b.visitorType,
      attendeeName: b.attendeeName,
      user: { name: b.user?.name, email: b.user?.email },
      token
    });
  } catch (e) { next(e); }
}

/* ---------- MANAGER: list ALL entry bookings ---------- */
// GET /api/entry/bookings/manage
async function listAllEntryBookingsForManager(req, res, next) {
  try {
    const { from, to, status, paymentStatus } = req.query || {};
    const q = {};

    if (status) q.status = status;
    if (paymentStatus) q.paymentStatus = paymentStatus;

    if (from || to) {
      q.day = {};
      if (from) q.day.$gte = toDayUTC(from);
      if (to) q.day.$lte = toDayUTC(to);
    }

    const rows = await EntryBooking.find(q)
      .populate("user", "name email")
      .sort({ createdAt: -1 })
      .lean();

    res.json(rows);
  } catch (e) { next(e); }
}

module.exports = {
  upsertInventory,
  listInventory,
  createEntryBooking,
  myEntryBookings,
  getEntryBooking,
  payEntryBooking,
  cancelEntryBooking,
  getEntryTicketToken,
  verifyEntryTicket,
  resolveEntryTicketPublic,
  // NEW
  listAllEntryBookingsForManager,
};
