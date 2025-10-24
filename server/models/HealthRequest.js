const mongoose = require("mongoose");

const healthRequestSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    elephant: { type: mongoose.Schema.Types.ObjectId, ref: "Elephant", required: true },
    status: { type: String, enum: ["pending", "fulfilled", "rejected"], default: "pending" },
    note: { type: String, trim: true },               // optional note from user
    managerNote: { type: String, trim: true },        // optional note from manager
    reportUrl: { type: String, trim: true, default: null }, // uploaded PDF (public static URL)
    respondedAt: { type: Date, default: null },
    respondedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

// helpful indexes
healthRequestSchema.index({ status: 1, createdAt: -1 });
healthRequestSchema.index({ user: 1, elephant: 1, status: 1 });

module.exports = mongoose.model("HealthRequest", healthRequestSchema);
