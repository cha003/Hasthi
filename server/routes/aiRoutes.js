// server/routes/aiRoutes.js
const router = require("express").Router();
const { health, summarize } = require("../controllers/aiController");

router.get("/health", health);
router.post("/summarize", summarize);

module.exports = router;
