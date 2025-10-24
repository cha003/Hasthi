const express = require("express");
const { protect } = require("../middleware/auth");
const {
  requestAdoption,
  listRequests,
  approveRequest,
  rejectRequest,
  listMyRequests,
  listMyAdoptedElephants, // <-- existing
  // --- NEW ---
  listMyCertificates,
  getCertificateByRequest,
} = require("../controllers/adoptionController");

const router = express.Router();

// user
router.post("/", protect, requestAdoption);
router.get("/mine", protect, listMyRequests);
router.get("/mine/elephants", protect, listMyAdoptedElephants); // <-- existing
// --- NEW: user certificate listing ---
router.get("/mine/certificates", protect, listMyCertificates);

// admin
router.get("/", protect, listRequests);
router.patch("/:id/approve", protect, approveRequest);
router.patch("/:id/reject", protect, rejectRequest);

// --- NEW: secure certificate download by adoption request id ---
router.get("/:id/certificate", protect, getCertificateByRequest);

module.exports = router;
