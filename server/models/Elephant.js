const mongoose = require("mongoose");

const healthSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["Healthy", "Under Treatment", "Recovering", "Unknown"],
      default: "Unknown",
    },
    weightKg: { type: Number, min: 0 },
    heightM: { type: Number, min: 0 },
    lastCheckup: { type: Date, default: null },
    vaccinations: { type: String, trim: true },
    notes: { type: String, trim: true },
  },
  { _id: false }
);

const elephantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    age: { type: Number, min: 0 },
    gender: { type: String, enum: ["Male", "Female"], required: true },
    location: { type: String, trim: true },
    notes: { type: String, trim: true },

    imageUrl: { type: String, trim: true, default: null }, // uploaded photo

    health: { type: healthSchema, default: () => ({}) },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    caretaker: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }, // assigned care-taker
    adopter: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    adoptedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

elephantSchema.index({ name: 1 }, { unique: false });

module.exports = mongoose.model("Elephant", elephantSchema);
