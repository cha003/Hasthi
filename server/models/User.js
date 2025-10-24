// server/models/User.js
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 60 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6, select: false },
    role: { type: String, enum: ["user", "manager" , "veterinarian" , "caretaker" , "admin","eventmanager"], default: "user" },
    // oauth extras
    provider: { type: String, enum: ["local", "google"], default: "local" },
    googleId: { type: String },
    avatar: { type: String },
    // NEW: keep track of Cloudinary public id so we can overwrite/cleanup
    avatarPublicId: { type: String }
  },
  { timestamps: true }
);

// hash password if modified
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = async function (entered) {
  return bcrypt.compare(entered, this.password);
};

module.exports = mongoose.model("User", userSchema);
