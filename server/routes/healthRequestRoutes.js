const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { protect, requireRole } = require("../middleware/auth");
const ctrl = require("../controllers/healthRequestController");

// Configure multer for PDF uploads
const uploadDir = path.join(__dirname, "..", "uploads", "healthreports");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || ".pdf").toLowerCase();
    const name = `hr_${Date.now()}_${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, name);
  },
});
const fileFilter = (_req, file, cb) => {
  if (file.mimetype === "application/pdf") return cb(null, true);
  cb(new Error("Only PDF files are allowed"));
};
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
});

const router = express.Router();

// USER
router.post("/", protect, requireRole("user"), ctrl.createHealthRequest);
router.get("/mine", protect, requireRole("user"), ctrl.listMyHealthRequests);

// MANAGER/ADMIN
router.get("/", protect, requireRole("manager", "admin"), ctrl.listHealthRequests);
router.patch("/:id/fulfill", protect, requireRole("manager", "admin"), upload.single("report"), ctrl.fulfillHealthRequest);
router.patch("/:id/reject", protect, requireRole("manager", "admin"), ctrl.rejectHealthRequest);

module.exports = router;
