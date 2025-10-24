// server/controllers/reportController.js
const mongoose = require("mongoose");
const Report = require("../models/Report");
const Elephant = require("../models/Elephant");

// Helper to get YYYY-MM-DD (UTC-based daily key)
function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * POST /api/reports
 * body: { elephantId, feedingDetails, healthNote }
 * role: caretaker
 */
exports.createReport = async (req, res, next) => {
  try {
    const { elephantId, feedingDetails, healthNote } = req.body;

    if (!elephantId || !feedingDetails) {
      return res.status(400).json({ message: "elephantId and feedingDetails are required" });
    }

    // Ensure the caretaker is assigned to this elephant
    const ele = await Elephant.findOne({ _id: elephantId, caretaker: req.user.id }).lean();
    if (!ele) {
      return res.status(403).json({ message: "You are not assigned to this elephant" });
    }

    const report = await Report.create({
      elephant: elephantId,
      caretaker: req.user.id,
      dateKey: todayKey(),
      feedingDetails,
      healthNote
    });

    res.status(201).json({ report });
  } catch (e) {
    // Handle duplicate (already submitted today)
    if (e && e.code === 11000) {
      return res.status(409).json({ message: "Today's report already exists for this elephant" });
    }
    next(e);
  }
};

/**
 * GET /api/reports/mine?q=&start=&end=
 * role: caretaker
 * - Returns this caretaker's reports
 * - Optional text search (elephant name, feedingDetails, healthNote)
 * - Optional dateKey range filter [start, end] (YYYY-MM-DD)
 */
exports.listMyReports = async (req, res, next) => {
  try {
    const { q, start, end } = req.query;

    const match = {
      caretaker: new mongoose.Types.ObjectId(req.user.id),
    };

    // date range on dateKey (strings like "2025-08-30")
    if (start || end) {
      match.dateKey = {};
      if (start) match.dateKey.$gte = start;
      if (end) match.dateKey.$lte = end;
    }

    const pipeline = [
      { $match: match },
      {
        $lookup: {
          from: "elephants",
          localField: "elephant",
          foreignField: "_id",
          as: "ele",
        },
      },
      { $unwind: "$ele" },
    ];

    if (q && q.trim()) {
      const rx = new RegExp(q.trim(), "i");
      pipeline.push({
        $match: {
          $or: [
            { feedingDetails: rx },
            { healthNote: rx },
            { "ele.name": rx },
            { "ele.location": rx },
          ],
        },
      });
    }

    pipeline.push(
      {
        $project: {
          _id: 1,
          elephant: 1,
          caretaker: 1,
          dateKey: 1,
          feedingDetails: 1,
          healthNote: 1,
          createdAt: 1,
          updatedAt: 1,
          elephantName: "$ele.name",
          elephantGender: "$ele.gender",
          elephantLocation: "$ele.location",
        },
      },
      { $sort: { dateKey: -1, createdAt: -1 } }
    );

    const reports = await Report.aggregate(pipeline);
    res.json({ reports });
  } catch (e) {
    next(e);
  }
};
