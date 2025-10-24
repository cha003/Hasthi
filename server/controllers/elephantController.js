const Elephant = require("../models/Elephant");
const User = require("../models/User");

// Create
exports.createElephant = async (req, res, next) => {
  try {
    const {
      name,
      age,
      gender,
      location,
      notes,
      // health fields come via multipart/form-data
      healthStatus,
      weightKg,
      heightM,
      lastCheckup,
      vaccinations,
      healthNotes,
    } = req.body;

    if (!name || !gender) {
      return res.status(400).json({ message: "name and gender are required" });
    }

    const elephantData = {
      name,
      gender,
      createdBy: req.user.id,
    };

    if (age !== undefined && age !== null && age !== "") {
      elephantData.age = Number(age);
    }
    if (location) elephantData.location = location;
    if (notes) elephantData.notes = notes;

    // image file
    if (req.file) {
      elephantData.imageUrl = `/uploads/elephants/${req.file.filename}`;
    }

    // health details (all optional)
    elephantData.health = {
      status: healthStatus || "Unknown",
    };
    if (weightKg !== undefined && weightKg !== "") elephantData.health.weightKg = Number(weightKg);
    if (heightM !== undefined && heightM !== "") elephantData.health.heightM = Number(heightM);
    if (lastCheckup) {
      const d = new Date(lastCheckup);
      if (!isNaN(d.getTime())) elephantData.health.lastCheckup = d;
    }
    if (vaccinations) elephantData.health.vaccinations = vaccinations;
    if (healthNotes) elephantData.health.notes = healthNotes;

    const elephant = await Elephant.create(elephantData);

    res.status(201).json({ elephant });
  } catch (e) {
    next(e);
  }
};

// Read (list)
exports.getElephants = async (req, res, next) => {
  try {
    const elephants = await Elephant.find().sort({ createdAt: -1 }).lean();
    res.json({ elephants });
  } catch (e) {
    next(e);
  }
};

// Update
exports.updateElephant = async (req, res, next) => {
  try {
    const { id } = req.params;

    // only allow these fields to be updated (extend to health + imageUrl if provided)
    const allow = ["name", "age", "gender", "location", "notes", "imageUrl", "health"];
    const update = {};

    for (const k of allow) {
      if (Object.prototype.hasOwnProperty.call(req.body, k)) {
        update[k] = req.body[k];
      }
    }

    // Coerce types if present
    if (Object.prototype.hasOwnProperty.call(update, "age") && update.age !== "") {
      update.age = Number(update.age);
    }
    if (update.health && typeof update.health === "object") {
      const h = {};
      if (Object.prototype.hasOwnProperty.call(update.health, "status")) h.status = update.health.status;
      if (Object.prototype.hasOwnProperty.call(update.health, "weightKg")) h.weightKg = Number(update.health.weightKg);
      if (Object.prototype.hasOwnProperty(call(update.health, "heightM"))) h.heightM = Number(update.health.heightM);
      if (Object.prototype.hasOwnProperty.call(update.health, "lastCheckup")) {
        const d = new Date(update.health.lastCheckup);
        if (!isNaN(d.getTime())) h.lastCheckup = d;
      }
      if (Object.prototype.hasOwnProperty.call(update.health, "vaccinations")) h.vaccinations = update.health.vaccinations;
      if (Object.prototype.hasOwnProperty.call(update.health, "notes")) h.notes = update.health.notes;
      update.health = h;
    }

    const elephant = await Elephant.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    });

    if (!elephant) return res.status(404).json({ message: "Elephant not found" });
    res.json({ elephant });
  } catch (e) {
    next(e);
  }
};

// Delete
exports.deleteElephant = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await Elephant.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: "Elephant not found" });
    res.json({ message: "Deleted", id });
  } catch (e) {
    next(e);
  }
};

// Assign caretaker (admin only)
exports.assignCaretaker = async (req, res, next) => {
  try {
    const { id } = req.params;              // elephant id
    const { caretakerId } = req.body;       // user id

    const caretaker = await User.findById(caretakerId).lean();
    if (!caretaker) return res.status(404).json({ message: "Care-taker not found" });
    if (caretaker.role !== "caretaker")
      return res.status(400).json({ message: "Selected user is not a care-taker" });

    const elephant = await Elephant.findByIdAndUpdate(
      id,
      { caretaker: caretaker._id },
      { new: true }
    ).lean();

    if (!elephant) return res.status(404).json({ message: "Elephant not found" });
    res.json({ elephant });
  } catch (e) { next(e); }
};

// Care-taker’s own elephants
exports.getMyElephants = async (req, res, next) => {
  try {
    const elephants = await Elephant.find({ caretaker: req.user.id }).sort({ createdAt: -1 }).lean();
    res.json({ elephants });
  } catch (e) { next(e); }
};

// PUBLIC/USER: list elephants available for adoption (no adopter assigned)
exports.listAdoptables = async (req, res, next) => {
  try {
    const elephants = await Elephant.find({ adopter: { $in: [null, undefined] } })
      .select("_id name age gender location")
      .sort({ createdAt: -1 })
      .lean();
    res.json({ elephants });
  } catch (e) { next(e); }
};

exports.listPublicElephants = async (req, res, next) => {
  try {
    // Only expose safe fields needed for browse/donation
    const elephants = await Elephant.find({})
      .select("name gender age location")
      .lean();
    res.json({ elephants });
  } catch (e) {
    next(e);
  }
};
