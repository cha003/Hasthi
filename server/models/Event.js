const mongoose = require("mongoose");

const EventSchema = new mongoose.Schema(
  {
    title:        { type: String, required: true, trim: true },
    description:  { type: String, trim: true },
    venue:        { type: String, trim: true },
    start:        { type: Date,   required: true },
    end:          { type: Date,   required: true },

    capacity:       { type: Number, required: true, min: 1 },
    remainingSeats: { type: Number, required: true, min: 0 },

    status: { type: String, enum: ["active", "cancelled"], default: "active" },

    // legacy (kept for backward compatibility)
    price:       { type: Number, min: 0, default: 0 },
    // primary price for tickets
    ticketPrice: { type: Number, min: 0, default: 0 },

    // event owner/manager
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// sanity check: start < end
EventSchema.pre("save", function (next) {
  if (this.start >= this.end) {
    return next(Object.assign(new Error("start must be before end"), { status: 400 }));
  }
  next();
});

EventSchema.index({ createdBy: 1, start: -1 });
EventSchema.index({ status: 1, start: 1 });

module.exports = mongoose.model("Event", EventSchema);
