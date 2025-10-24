const mongoose = require("mongoose");

const donationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    elephant: { type: mongoose.Schema.Types.ObjectId, ref: "Elephant", required: true },

    amount: { type: Number, required: true }, // major units (e.g., 1000 LKR)
    currency: { type: String, default: (process.env.STRIPE_CURRENCY || "lkr").toLowerCase() },

    note: { type: String, trim: true },

    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
      index: true
    },

    // Stripe references
    stripeSessionId: { type: String, index: true, unique: true, sparse: true },
    stripePaymentIntentId: { type: String },
    stripeCustomerEmail: { type: String },

    // Human-friendly receipt number (e.g., DN-2025-123456)
    receiptNo: { type: String, index: true },
  },
  { timestamps: true }
);

donationSchema.index({ user: 1, createdAt: -1 });

// Simple receipt number generator
donationSchema.pre("save", function genReceipt(next) {
  if (this.isNew && !this.receiptNo) {
    const y = new Date().getFullYear();
    const r = Math.floor(100000 + Math.random() * 900000);
    this.receiptNo = `DN-${y}-${r}`;
  }
  next();
});

module.exports = mongoose.model("Donation", donationSchema);
