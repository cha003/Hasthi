// server/models/Report.js
const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema(
  {
    elephant: { type: mongoose.Schema.Types.ObjectId, ref: "Elephant", required: true },
    caretaker: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    dateKey: { type: String, required: true }, // "YYYY-MM-DD"
    feedingDetails: { type: String, required: true, trim: true },
    healthNote: { type: String, trim: true }
  },
  { timestamps: true }
);

// one report per elephant per day
reportSchema.index({ elephant: 1, dateKey: 1 }, { unique: true });
// fast lookups by caretaker + day
reportSchema.index({ caretaker: 1, dateKey: 1 });

module.exports = mongoose.model("Report", reportSchema);
