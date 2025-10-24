// server/controllers/donationController.js
const Stripe = require("stripe");
const Donation = require("../models/Donation");
const Elephant = require("../models/Elephant"); // if you have this model
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const CURRENCY = (process.env.STRIPE_CURRENCY || "lkr").toLowerCase();

function toMinor(currency, amountMajor) {
  const ZERO_DECIMAL = new Set(["jpy", "krw"]);
  return ZERO_DECIMAL.has(currency) ? Math.round(amountMajor) : Math.round(amountMajor * 100);
}

// POST /api/donations/checkout
// body: { elephantId, amount, note }
async function createDonationCheckout(req, res, next) {
  try {
    const { elephantId, amount, note } = req.body || {};
    const amt = Number(amount);
    if (!amt || amt <= 0) return res.status(400).json({ message: "Valid positive amount is required" });

    let eleName = "Elephant Care";
    if (elephantId) {
      const ele = await Elephant.findById(elephantId).lean().catch(() => null);
      if (ele?.name) eleName = `Donation to ${ele.name}`;
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: CURRENCY,
            product_data: { name: eleName },
            unit_amount: toMinor(CURRENCY, amt),
          },
          quantity: 1,
        },
      ],
      success_url: `${FRONTEND_URL}/donations/receipt?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${FRONTEND_URL}/donations/cancelled`,
      metadata: {
        userId: String(req.user?._id || ""),
        elephantId: String(elephantId || ""),
        note: String(note || ""),
      },
    });

    // Create a pending record now (optional), will finalize on webhook
    await Donation.create({
      user: req.user?._id,
      elephant: elephantId || undefined,
      amount: amt,
      currency: CURRENCY,
      note: note?.trim(),
      status: "pending",
      stripeSessionId: session.id,
    });

    res.json({ url: session.url });
  } catch (e) {
    next(e);
  }
}

// POST /api/donations/stripe/webhook
async function stripeWebhook(req, res) {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.rawBody, // ensure raw body in express
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      // finalize the donation record
      const donation = await Donation.findOne({ stripeSessionId: session.id });
      const amountMajor = session.amount_total
        ? (session.currency === "jpy" || session.currency === "krw"
            ? session.amount_total
            : session.amount_total / 100)
        : undefined;

      if (!donation) {
        // in case it wasn't pre-created
        await Donation.create({
          user: session.metadata?.userId || undefined,
          elephant: session.metadata?.elephantId || undefined,
          note: session.metadata?.note || undefined,
          amount: amountMajor,
          currency: (session.currency || CURRENCY).toLowerCase(),
          status: "paid",
          stripeSessionId: session.id,
          stripePaymentIntentId: session.payment_intent || undefined,
          stripeCustomerEmail: session.customer_details?.email || undefined,
        });
      } else {
        donation.status = "paid";
        if (amountMajor) donation.amount = amountMajor;
        donation.currency = (session.currency || CURRENCY).toLowerCase();
        donation.stripePaymentIntentId = session.payment_intent || donation.stripePaymentIntentId;
        donation.stripeCustomerEmail = session.customer_details?.email || donation.stripeCustomerEmail;
        await donation.save();
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error("Webhook handler failed", err);
    res.status(500).json({ received: false });
  }
}

// GET /api/donations/receipt?session_id=cs_xxx
async function getDonationReceipt(req, res, next) {
  try {
    const { session_id } = req.query || {};
    if (!session_id) return res.status(400).json({ message: "session_id is required" });

    const donation = await Donation.findOne({ stripeSessionId: session_id })
      .populate("user", "name email")
      .populate("elephant", "name gender age location")
      .lean();

    if (!donation) return res.status(404).json({ message: "Receipt not found" });

    res.json({
      receiptNo: donation.receiptNo,
      createdAt: donation.createdAt,
      status: donation.status,
      amount: donation.amount,
      currency: (donation.currency || CURRENCY).toUpperCase(),
      note: donation.note,
      elephant: donation.elephant
        ? {
            id: donation.elephant._id,
            name: donation.elephant.name,
            gender: donation.elephant.gender,
            age: donation.elephant.age,
            location: donation.elephant.location,
          }
        : null,
      donor: donation.user ? { name: donation.user.name, email: donation.user.email } : null,
      stripe: {
        sessionId: donation.stripeSessionId,
        paymentIntentId: donation.stripePaymentIntentId || null,
        customerEmail: donation.stripeCustomerEmail || null,
      },
    });
  } catch (e) {
    next(e);
  }
}

module.exports = {
  createDonationCheckout,
  stripeWebhook,
  getDonationReceipt,
};
