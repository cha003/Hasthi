// server/routes/analyticsRoutes.js
const express = require("express");
const router = express.Router();
const { getAnalytics } = require("../controllers/analyticsController");
// add auth here if you want
router.get("/", getAnalytics);
module.exports = router;
