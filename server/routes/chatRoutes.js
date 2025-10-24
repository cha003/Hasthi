// server/routes/chatRoutes.js
const express = require("express");
const router = express.Router();
const { chat } = require("../controllers/chatController");

// If you have auth middleware, you can optionally protect:
// const { protect } = require("../middleware/auth");
// router.post("/", protect, chat);

router.post("/", chat);

module.exports = router;
