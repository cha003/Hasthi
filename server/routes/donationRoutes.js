// server/routes/donationRoutes.js
const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth"); // if you protect endpoints
const donationController = require("../controllers/donationController");

// create checkout (user must be logged in? or public)
router.post("/checkout", auth.optional || auth.required, donationController.createDonationCheckout);

// webhook (must use raw body in app-level)
router.post("/stripe/webhook", (req, res) => res.status(405).end()); // handled in app.js as raw

// receipt by session id
router.get("/receipt", auth.optional || auth.required, donationController.getDonationReceipt);

module.exports = router;
