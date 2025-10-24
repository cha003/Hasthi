const router = require("express").Router();
const { protect } = require("../middleware/auth");
const {
  createEventCheckout, confirmEventPayment,
  createEntryCheckout,  confirmEntryPayment,
  createDonationCheckout, getDonationReceipt,
} = require("../controllers/paymentController");

router.post("/checkout/event/:id",  protect, createEventCheckout);
router.post("/confirm/event/:id",   protect, confirmEventPayment);

router.post("/checkout/entry/:id",  protect, createEntryCheckout);
router.post("/confirm/entry/:id",   protect, confirmEntryPayment);

router.post("/checkout/donation",   protect, createDonationCheckout);

// success page on client calls this to fetch + confirm
router.get("/checkout/donation/receipt", getDonationReceipt);

module.exports = router;
