const Stripe = require("stripe");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });

const Booking = require("../models/Booking");
const EntryBooking = require("../models/EntryBooking");
const Event = require("../models/Event");

const Donation = require("../models/Donation");   // <-- add
const Elephant = require("../models/Elephant");   // <-- add

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
const CURRENCY  = (process.env.STRIPE_CURRENCY || "usd").toLowerCase();

function moneyToStripe(amountNumber) {
  return Math.max(0, Math.round(Number(amountNumber || 0) * 100));
}
function ensureOwnerOrAdmin(doc, user) {
  if (!doc || !user) return false;
  if (String(doc.user) === String(user._id || user.id)) return true;
  if (user.role === "admin") return true;
  return false;
}
function sessionAmountMajor(session) {
  const zeroDecimal = new Set(["jpy", "krw"]);
  const cur = (session?.currency || CURRENCY).toLowerCase();
  const total = Number(session?.amount_total || 0);
  if (!Number.isFinite(total) || total <= 0) return null;
  return zeroDecimal.has(cur) ? total : total / 100;
}

/* -------------------- EVENT checkout & confirm (your code, unchanged) -------------------- */
async function createEventCheckout(req, res) {
  try {
    const bookingId = req.params.id;
    const { qtyOverride, unitOverride, totalOverride } = req.body || {};

    const b = await Booking.findById(bookingId).lean();
    if (!b) return res.status(404).json({ message: "Event booking not found" });
    if (!ensureOwnerOrAdmin(b, req.user)) return res.status(403).json({ message: "Forbidden" });
    if (b.status === "cancelled") return res.status(400).json({ message: "Booking is cancelled" });
    if (b.paymentStatus === "paid") return res.status(400).json({ message: "Already paid" });

    let ev = null;
    if (b.event && typeof b.event === "object") ev = b.event;
    else if (b.event) ev = await Event.findById(b.event).lean();
    if (!ev) return res.status(404).json({ message: "Event not found" });

    const qtyFromBooking = Number(b.quantity ?? b.tickets ?? 1);
    const qty = Number(qtyOverride) > 0
      ? Number(qtyOverride)
      : (Number.isFinite(qtyFromBooking) && qtyFromBooking > 0 ? qtyFromBooking : 1);

    const unitFromEvent = (() => {
      const tp = Number(ev.ticketPrice);
      if (Number.isFinite(tp) && tp > 0) return tp;
      const pr = Number(ev.price);
      if (Number.isFinite(pr) && pr > 0) return pr;
      return 0;
    })();

    const unitFromBooking = (() => {
      const u1 = Number(b.unitPrice);
      if (Number.isFinite(u1) && u1 > 0) return u1;
      const u2 = Number(b.price);
      if (Number.isFinite(u2) && u2 > 0) return u2;
      return 0;
    })();

    const totalPersisted = Number(b.total);
    const totalFromOverride = Number(totalOverride);

    let unit =
      (Number(unitOverride) > 0 && Number(unitOverride)) ||
      unitFromEvent ||
      unitFromBooking ||
      0;

    if (!(unit > 0)) {
      const totalCandidate =
        (Number.isFinite(totalFromOverride) && totalFromOverride > 0 && totalFromOverride) ||
        (Number.isFinite(totalPersisted) && totalPersisted > 0 && totalPersisted) ||
        0;
      if (totalCandidate > 0 && qty > 0) unit = totalCandidate / qty;
    }

    if (!(unit > 0)) {
      return res.status(400).json({
        message: "No valid ticket price found. Set event.ticketPrice (or event.price), or persist a positive booking.total."
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      currency: CURRENCY,
      metadata: {
        kind: "event",
        bookingId: String(b._id),
        userId: String(b.user),
        eventId: String(ev._id || b.event),
      },
      line_items: [{
        quantity: qty,
        price_data: {
          currency: CURRENCY,
          unit_amount: moneyToStripe(unit),
          product_data: {
            name: ev.title || "Event ticket",
            description: ev.venue ? `Venue: ${ev.venue}` : undefined,
          },
        },
      }],
      success_url: `${CLIENT_URL}/payments/${b._id}?ok=1&type=event&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${CLIENT_URL}/payments/${b._id}?ok=0&type=event`,
    });

    return res.json({ url: session.url });
  } catch (err) {
    console.error("createEventCheckout error:", err?.raw?.message || err.message || err);
    return res.status(400).json({ message: err?.raw?.message || err.message || "Failed to start checkout" });
  }
}

async function confirmEventPayment(req, res) {
  try {
    const bookingId = req.params.id;
    const { sessionId } = req.body || {};
    if (!sessionId) return res.status(400).json({ message: "sessionId is required" });

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (!session || session.payment_status !== "paid") {
      return res.status(400).json({ message: "Payment not completed" });
    }

    const kind = session.metadata?.kind;
    const metaBooking = session.metadata?.bookingId;
    if (kind !== "event") return res.status(400).json({ message: "Wrong payment kind" });
    if (String(metaBooking) !== String(bookingId)) {
      return res.status(400).json({ message: "Session does not match booking" });
    }

    const b = await Booking.findById(bookingId);
    if (!b) return res.status(404).json({ message: "Event booking not found" });
    if (!ensureOwnerOrAdmin(b, req.user)) return res.status(403).json({ message: "Forbidden" });

    if (b.paymentStatus !== "paid") {
      b.paymentStatus = "paid";
      await b.save();
    }

    return res.json({ ok: true, booking: b });
  } catch (err) {
    console.error("confirmEventPayment error:", err);
    return res.status(500).json({ message: "Failed to confirm event payment" });
  }
}

/* -------------------- ENTRY checkout & confirm (your code, unchanged) -------------------- */
async function createEntryCheckout(req, res) {
  try {
    const bookingId = req.params.id;
    const b = await EntryBooking.findById(bookingId).lean();
    if (!b) return res.status(404).json({ message: "Entry booking not found" });
    if (!ensureOwnerOrAdmin(b, req.user)) return res.status(403).json({ message: "Forbidden" });
    if (b.status === "cancelled") return res.status(400).json({ message: "Booking is cancelled" });
    if (b.paymentStatus === "paid") return res.status(400).json({ message: "Already paid" });

    const items = Array.isArray(b.items) ? b.items : [];
    let computed = 0;
    if (items.length) {
      for (const it of items) computed += Number(it.qty || 0) * Number(it.unitPrice || 0);
    } else {
      const qty = Number(b.tickets || 0);
      const unit = Number(b.unitPrice || b.price || 0);
      computed = qty * unit;
    }
    const total = typeof b.total === "number" && b.total > 0 ? b.total : computed;
    if (!(total > 0)) return res.status(400).json({ message: "No payable items on this booking" });

    const line_items = (items.length ? items : [{
      name: "Entry ticket",
      qty: Number(b.tickets || 1),
      unitPrice: Number(b.unitPrice || b.price || total),
    }]).map((it) => ({
      quantity: Number(it.qty || 1),
      price_data: {
        currency: CURRENCY,
        unit_amount: moneyToStripe(it.unitPrice || 0),
        product_data: {
          name: (it.type ? `${String(it.type).toUpperCase()} ticket` : it.name) || "Entry ticket",
        },
      },
    }));

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      currency: CURRENCY,
      metadata: { kind: "entry", bookingId: String(b._id), userId: String(b.user) },
      line_items,
      success_url: `${CLIENT_URL}/payments/entry/${b._id}?ok=1&type=entry&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${CLIENT_URL}/payments/entry/${b._id}?ok=0&type=entry`,
    });

    return res.json({ url: session.url });
  } catch (err) {
    console.error("createEntryCheckout error:", err);
    return res.status(500).json({ message: "Failed to start checkout" });
  }
}

async function confirmEntryPayment(req, res) {
  try {
    const bookingId = req.params.id;
    const { sessionId } = req.body || {};
    if (!sessionId) return res.status(400).json({ message: "sessionId is required" });

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (!session || session.payment_status !== "paid") {
      return res.status(400).json({ message: "Payment not completed" });
    }
    const metaBooking = session.metadata?.bookingId;
    if (String(metaBooking) !== String(bookingId)) {
      return res.status(400).json({ message: "Session does not match booking" });
    }

    const b = await EntryBooking.findById(bookingId);
    if (!b) return res.status(404).json({ message: "Entry booking not found" });
    if (!ensureOwnerOrAdmin(b, req.user)) return res.status(403).json({ message: "Forbidden" });

    if (b.paymentStatus !== "paid") {
      b.paymentStatus = "paid";
      await b.save();
    }

    return res.json({ ok: true, booking: b });
  } catch (err) {
    console.error("confirmEntryPayment error:", err);
    return res.status(500).json({ message: "Failed to confirm payment" });
  }
}

/* -------------------- DONATION: checkout + receipt -------------------- */
async function createDonationCheckout(req, res) {
  try {
    const { elephantId, amount = 0, note } = req.body || {};
    if (!req.user?._id && !req.user?.id) {
      return res.status(401).json({ message: "Login required" });
    }
    if (!elephantId) return res.status(400).json({ message: "elephantId is required" });
    if (!(Number(amount) > 0)) return res.status(400).json({ message: "Donation amount must be > 0" });

    const ele = await Elephant.findById(elephantId).lean();
    if (!ele) return res.status(404).json({ message: "Elephant not found" });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      currency: CURRENCY,
      metadata: {
        kind: "donation",
        userId: String(req.user._id || req.user.id),
        elephantId: String(elephantId),
        note: note || "",
      },
      line_items: [{
        quantity: 1,
        price_data: {
          currency: CURRENCY,
          unit_amount: moneyToStripe(amount),
          product_data: { name: `Donation to ${ele.name}`, description: note || undefined },
        },
      }],
      success_url: `${CLIENT_URL}/donations/receipt?session_id={CHECKOUT_SESSION_ID}`, // <-- front-end route
      cancel_url: `${CLIENT_URL}/donate`,
    });

    await Donation.create({
      user: req.user._id || req.user.id,
      elephant: ele._id,
      amount: Number(amount),
      currency: CURRENCY,
      note: note?.trim(),
      paymentStatus: "pending",
      stripeSessionId: session.id,
    });

    return res.json({ url: session.url });
  } catch (err) {
    console.error("createDonationCheckout error:", err);
    return res.status(500).json({ message: "Failed to start donation checkout" });
  }
}

async function getDonationReceipt(req, res) {
  try {
    const { session_id } = req.query || {};
    if (!session_id) return res.status(400).json({ message: "session_id is required" });

    const donation = await Donation.findOne({ stripeSessionId: session_id })
      .populate("user", "name email")
      .populate("elephant", "name gender age location");

    if (!donation) return res.status(404).json({ message: "Receipt not found" });

    // confirm with Stripe; mark paid if needed
    let session;
    try { session = await stripe.checkout.sessions.retrieve(session_id); } catch {}
    if (session?.payment_status === "paid" && donation.paymentStatus !== "paid") {
      const paidAmount = sessionAmountMajor(session);
      if (paidAmount != null) donation.amount = paidAmount;
      donation.currency = (session?.currency || CURRENCY).toLowerCase();
      donation.paymentStatus = "paid";
      donation.stripePaymentIntentId = session?.payment_intent || donation.stripePaymentIntentId;
      donation.stripeCustomerEmail = session?.customer_details?.email || donation.stripeCustomerEmail;
      await donation.save();
    }

    return res.json({
      receiptNo: donation.receiptNo,
      createdAt: donation.createdAt,
      paymentStatus: donation.paymentStatus,
      amount: donation.amount,
      currency: (donation.currency || CURRENCY).toUpperCase(),
      note: donation.note,
      elephant: donation.elephant ? {
        id: donation.elephant._id,
        name: donation.elephant.name,
        gender: donation.elephant.gender,
        age: donation.elephant.age,
        location: donation.elephant.location,
      } : null,
      user: donation.user ? { name: donation.user.name, email: donation.user.email } : null,
      stripeSessionId: donation.stripeSessionId,
      stripePaymentIntentId: donation.stripePaymentIntentId || null,
      stripeCustomerEmail: donation.stripeCustomerEmail || null,
    });
  } catch (err) {
    console.error("getDonationReceipt error:", err);
    return res.status(500).json({ message: "Failed to load receipt" });
  }
}

module.exports = {
  createEventCheckout,
  confirmEventPayment,
  createEntryCheckout,
  confirmEntryPayment,
  createDonationCheckout,
  getDonationReceipt, // <-- export
};
