const mongoose = require("mongoose");

// One document per day controlling capacity & price
const EntryInventorySchema = new mongoose.Schema(
  {
    // Store day normalized to UTC midnight
    day: { type: Date, required: true, unique: true },
    capacity: { type: Number, min: 0, required: true },
    remaining: { type: Number, min: 0, required: true },
    price: { type: Number, min: 0, default: 0 }
  },
  { timestamps: true }
);

module.exports = mongoose.model("EntryInventory", EntryInventorySchema);
