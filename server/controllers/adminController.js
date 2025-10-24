// server/controllers/adminController.js
const User = require("../models/User");

const ROLES = ["user", "manager", "caretaker", "veterinarian", "admin","eventmanager"];

// List users (optional filter by role with ?role=caretaker)
exports.listUsers = async (req, res, next) => {
  try {
    const qry = {};
    if (req.query.role && ROLES.includes(req.query.role)) qry.role = req.query.role;
    const users = await User.find(qry).sort({ createdAt: -1 }).select("_id name email role createdAt").lean();
    res.json({ users });
  } catch (e) { next(e); }
};

// Update user role
exports.updateUserRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    if (!ROLES.includes(role)) return res.status(400).json({ message: "Invalid role" });

    const user = await User.findByIdAndUpdate(id, { role }, { new: true }).select("_id name email role").lean();
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ user });
  } catch (e) { next(e); }
};

// Delete user (disallow self-delete for safety)
exports.deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (String(req.user.id) === String(id)) {
      return res.status(400).json({ message: "You cannot delete your own account" });
    }
    const deleted = await User.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: "User not found" });
    res.json({ message: "Deleted", id });
  } catch (e) { next(e); }
};
