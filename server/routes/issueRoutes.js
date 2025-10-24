// server/routes/issueRoutes.js
const express = require("express");
const multer = require("multer");
const { protect, requireRole } = require("../middleware/auth");
const {
  createIssue,
  listAllIssues,
  uploadPrescription,
  listMyIssues,
  getPrescriptionDownloadUrl
} = require("../controllers/issueController");

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// caretaker submits an issue (now supports optional image)
router.post("/", protect, requireRole("caretaker"), upload.single("image"), createIssue);

// veterinarian views all issues
router.get("/", protect, requireRole("veterinarian"), listAllIssues);

// veterinarian uploads prescription (image/pdf + note)
router.patch("/:id/prescription", protect, requireRole("veterinarian"), upload.single("file"), uploadPrescription);

// caretaker views own issues (optionally filter by elephantId)
router.get("/mine", protect, requireRole("caretaker"), listMyIssues);

// signed short-lived prescription download URL
router.get("/:id/prescription/download", protect, getPrescriptionDownloadUrl);

module.exports = router;
