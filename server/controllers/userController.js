// server/controllers/userController.js
const User = require("../models/User");
const { uploadBuffer, destroyByPublicId } = require("../utils/cloudinary");

// GET /api/users/me
exports.getMe = async (req, res, next) => {
  try {
    const me = await User.findById(req.user.id).select("-password").lean();
    res.json({ user: me });
  } catch (e) { next(e); }
};

// PATCH /api/users/me  (name/email)
exports.updateMe = async (req, res, next) => {
  try {
    const { name, email } = req.body;
    const updates = {};
    if (name) updates.name = String(name).trim();
    if (email) updates.email = String(email).trim().toLowerCase();

    // if email changed, ensure unique
    if (updates.email) {
      const exists = await User.findOne({ email: updates.email, _id: { $ne: req.user.id } }).lean();
      if (exists) return res.status(400).json({ message: "Email is already in use" });
    }

    const doc = await User.findByIdAndUpdate(req.user.id, { $set: updates }, { new: true, runValidators: true }).select("-password");
    res.json({ user: doc });
  } catch (e) { next(e); }
};

// PATCH /api/users/me/avatar  (upload/replace avatar via Cloudinary)
exports.updateAvatar = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Image file is required" });
    const mime = req.file.mimetype || "";
    if (!mime.startsWith("image/")) return res.status(400).json({ message: "Only image files are allowed" });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Reuse a stable public_id so Cloudinary overwrites (keeps URLs stable if you don't use versions)
    const publicIdBase = `avatars/user-${user._id}`;
    const uploaded = await uploadBuffer(req.file.buffer, {
      folder: "hasthi",
      public_id: publicIdBase, // final: hasthi/avatars/user-<id>
    });

    // cleanup old publicId if it differs (normally same because overwrite)
    if (user.avatarPublicId && user.avatarPublicId !== uploaded.public_id) {
      destroyByPublicId(user.avatarPublicId, "image").catch(() => {});
    }

    user.avatar = uploaded.secure_url;
    user.avatarPublicId = uploaded.public_id;
    await user.save();

    const safe = user.toObject();
    delete safe.password;
    res.json({ user: safe, message: "Avatar updated" });
  } catch (e) { next(e); }
};

// PATCH /api/users/me/password
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword = "", newPassword, confirmPassword } = req.body || {};
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters" });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    const user = await User.findById(req.user.id).select("+password");
    if (!user) return res.status(404).json({ message: "User not found" });

    // For local users: verify current password
    // For Google users: allow setting a password without current (treat as "set password")
    if (user.provider === "local") {
      const ok = await user.matchPassword(currentPassword || "");
      if (!ok) return res.status(400).json({ message: "Current password is incorrect" });
    }

    user.password = newPassword; // will be hashed by pre-save
    await user.save();
    res.json({ message: "Password updated successfully" });
  } catch (e) { next(e); }
};

// DELETE /api/users/me
exports.deleteMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Optional: block deletion for privileged roles (comment out if not needed)
    // if (["admin", "manager", "veterinarian", "caretaker"].includes(user.role)) {
    //   return res.status(403).json({ message: "Please contact admin to delete this account" });
    // }

    // Remove avatar from Cloudinary
    if (user.avatarPublicId) {
      destroyByPublicId(user.avatarPublicId, "image").catch(() => {});
    }

    await user.deleteOne();
    res.json({ message: "Account deleted" });
  } catch (e) { next(e); }
};
