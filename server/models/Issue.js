// server/models/Issue.js
const mongoose = require("mongoose");

const issueSchema = new mongoose.Schema(
  {
    elephant: { type: mongoose.Schema.Types.ObjectId, ref: "Elephant", required: true },
    caretaker: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    description: { type: String, required: true, trim: true },

    // NEW: optional photo attached by caretaker at creation time
    photo: {
      url: String,
      publicId: String,
      format: String,
      resourceType: String, // image
      uploadedAt: Date,
    },

    // prescription uploaded later by veterinarian
    prescription: {
      note: { type: String, trim: true },
      url: { type: String },
      publicId: { type: String },
      format: { type: String },        // 'jpg', 'png', 'pdf', ...
      resourceType: { type: String },  // 'image' or 'raw'
      deliveryType: { type: String },  // 'upload' | 'authenticated' | 'private'
      version: { type: Number },
      uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      uploadedAt: { type: Date }
    }
  },
  { timestamps: true }
);

issueSchema.index({ elephant: 1, createdAt: -1 });
issueSchema.index({ caretaker: 1, createdAt: -1 });

module.exports = mongoose.model("Issue", issueSchema);
