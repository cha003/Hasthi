const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { protect, requireRole } = require("../middleware/auth");
const {
  createElephant,
  getElephants,
  updateElephant,
  deleteElephant,
  assignCaretaker,
  getMyElephants,
  listAdoptables
} = require("../controllers/elephantController");
const elephantCtrl = require("../controllers/elephantController");

const router = express.Router();

/* ===== Multer setup for elephant images ===== */
const uploadDir = path.join(__dirname, "..", "uploads", "elephants");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || ".jpg").toLowerCase();
    const name = `ele_${Date.now()}_${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, name);
  },
});
const fileFilter = (_req, file, cb) => {
  const ok = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
  if (ok.includes(file.mimetype)) return cb(null, true);
  cb(new Error("Only JPG/PNG/WEBP images are allowed"));
};
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
});

/* ===== Routes ===== */

// manager OR admin can CRUD elephants
router.post("/", protect, requireRole("manager", "admin"), upload.single("image"), createElephant);
router.get("/", protect, requireRole("manager", "admin"), getElephants);
router.patch("/:id", protect, requireRole("manager", "admin"), updateElephant);
router.delete("/:id", protect, requireRole("manager", "admin"), deleteElephant);

// admin: assign caretaker
router.patch("/:id/assign", protect, requireRole("admin"), assignCaretaker);

// caretaker: list assigned to me
router.get("/mine/list", protect, requireRole("caretaker"), getMyElephants);

// adoptables (user must be logged in)
router.get("/adoptables", protect, listAdoptables);

router.get("/public", protect, elephantCtrl.listPublicElephants);

module.exports = router;
