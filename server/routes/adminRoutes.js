// server/routes/adminRoutes.js
const express = require("express");
const { protect, requireRole } = require("../middleware/auth");
const { listUsers, updateUserRole, deleteUser } = require("../controllers/adminController");

const router = express.Router();

router.use(protect, requireRole("admin"));

router.get("/users", listUsers);
router.patch("/users/:id/role", updateUserRole);
router.delete("/users/:id", deleteUser);

module.exports = router;
