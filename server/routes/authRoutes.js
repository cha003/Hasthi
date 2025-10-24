// server/routes/authRoutes.js
const express = require("express");
const { register, login, me, logout, googleAuth } = require("../controllers/authController");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/google", googleAuth);     // <-- NEW
router.get("/me", protect, me);
router.post("/logout", protect, logout);

module.exports = router;
