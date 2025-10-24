// server/routes/userRoutes.js
const express = require("express");
const multer = require("multer");
const { protect } = require("../middleware/auth");
const {
  getMe,
  updateMe,
  updateAvatar,
  changePassword,
  deleteMe
} = require("../controllers/userController");

const router = express.Router();

// Multer memory storage for avatar uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// All routes below require auth
router.use(protect);

router.get("/me", getMe);
router.patch("/me", updateMe);
router.patch("/me/avatar", upload.single("avatar"), updateAvatar);
router.patch("/me/password", changePassword);
router.delete("/me", deleteMe);

module.exports = router;
