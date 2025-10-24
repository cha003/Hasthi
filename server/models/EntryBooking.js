// server/models/EntryBooking.js
const mongoose = require("mongoose");

const EntryItemSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["adult", "child"], required: true },
    qty: { type: Number, required: true, min: 0 },
    unitPrice: { type: Number, required: true, min: 0 }
  },
  { _id: false }
);

const EntryBookingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    day:  { type: Date, required: true, index: true },

    // Who is visiting (affects pricing)
    visitorType: { type: String, enum: ["local", "foreign"], required: true, default: "local", index: true },

    // Optional slot & attendee info (your controller uses these)
    timeSlot: { type: String, default: null, trim: true },
    attendeeName: { type: String, trim: true },
    phone: { type: String, trim: true },
    note: { type: String, trim: true },

    // Items breakdown & counts
    items: [EntryItemSchema],
    tickets: { type: Number, required: true, min: 1 },

    // Money
    total: { type: Number, required: true, min: 0 },
    currency: { type: String, default: (process.env.STRIPE_CURRENCY || "usd").toLowerCase() },

    // Status
    status: {
      type: String,
      enum: ["booked", "cancelled"],
      default: "booked",
      index: true
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "refunded"],
      default: "pending",
      index: true
    },

    // Ticketing
    ticketToken: { type: String, default: null },
    ticketIssuedAt: { type: Date, default: null },
    scannedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.model("EntryBooking", EntryBookingSchema);
