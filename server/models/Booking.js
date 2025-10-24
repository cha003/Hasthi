const mongoose = require("mongoose");

const BookingSchema = new mongoose.Schema(
  {
    user:  { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    event: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true },

    // booking details
    tickets:      { type: Number, min: 1, required: true },
    attendeeName: { type: String, trim: true, required: true },
    phone:        { type: String, trim: true, required: true },
    note:         { type: String, trim: true },

    // states
    status:        { type: String, enum: ["booked", "cancelled"], default: "booked" },
    paymentStatus: { type: String, enum: ["pending", "paid"],     default: "pending" },

    // e-ticket
    ticketToken:    { type: String },
    ticketIssuedAt: { type: Date },
    
    // QR Code for ticket
    qrCode: { type: String },  // Store QR code URL or base64 string

    total: { type: Number, default: 0 },  // Add total field
  },
  { timestamps: true }
);

// Calculate total price based on ticketPrice and quantity
BookingSchema.pre("save", function(next) {
  if (this.event && this.tickets) {
    const event = this.event;  // Load event info
    this.total = event.ticketPrice * this.tickets;  // Calculate total
  }
  next();
});

BookingSchema.index({ user: 1, event: 1, status: 1 }, { unique: true });

module.exports = mongoose.model("Booking", BookingSchema);
