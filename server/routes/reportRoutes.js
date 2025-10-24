// server/routes/reportRoutes.js
const express = require("express");
const { protect, requireRole } = require("../middleware/auth");
const { createReport, listMyReports } = require("../controllers/reportController");
const { monthlyInvoicePdf } = require("../controllers/reportNController");


const router = express.Router();

// caretaker: create a daily report
router.post("/", protect, requireRole("caretaker"), createReport);

// caretaker: list my reports with filters
router.get("/mine", protect, requireRole("caretaker"), listMyReports);

// GET /api/reports/invoice/2025/08.pdf
router.get("/invoice/:year/:month.pdf", protect, requireRole("admin"), monthlyInvoicePdf);

module.exports = router;
