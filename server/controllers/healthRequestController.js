const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");
const HealthRequest = require("../models/HealthRequest");
const Elephant = require("../models/Elephant");

// USER: create health status request for an adopted elephant
exports.createHealthRequest = async (req, res, next) => {
  try {
    if (req.user.role !== "user") {
      return res.status(403).json({ message: "Only users can request health reports" });
    }
    const { elephantId, note } = req.body;
    if (!elephantId) return res.status(400).json({ message: "elephantId is required" });

    const ele = await Elephant.findById(elephantId).lean();
    if (!ele) return res.status(404).json({ message: "Elephant not found" });

    // must be the adopter
    if (String(ele.adopter || "") !== String(req.user.id)) {
      return res.status(403).json({ message: "You can only request reports for elephants you adopted" });
    }

    // prevent duplicate pending request for same user-elephant
    const existing = await HealthRequest.findOne({
      user: req.user.id,
      elephant: elephantId,
      status: "pending",
    }).lean();
    if (existing) return res.status(400).json({ message: "You already have a pending request for this elephant" });

    const doc = await HealthRequest.create({
      user: req.user.id,
      elephant: elephantId,
      note: (note || "").trim(),
    });

    res.status(201).json({ request: doc });
  } catch (e) { next(e); }
};

// USER: list my requests (optionally by elephant)
exports.listMyHealthRequests = async (req, res, next) => {
  try {
    if (req.user.role !== "user") return res.status(403).json({ message: "User only" });

    const { elephantId } = req.query;
    const match = { user: new mongoose.Types.ObjectId(req.user.id) };
    if (elephantId) match.elephant = new mongoose.Types.ObjectId(elephantId);

    const pipeline = [
      { $match: match },
      { $sort: { createdAt: -1 } },
      { $lookup: { from: "elephants", localField: "elephant", foreignField: "_id", as: "e" } },
      { $unwind: "$e" },
      {
        $project: {
          _id: 1, status: 1, note: 1, managerNote: 1, reportUrl: 1, createdAt: 1, respondedAt: 1,
          elephantId: "$e._id", elephantName: "$e.name"
        }
      }
    ];
    const requests = await HealthRequest.aggregate(pipeline);
    res.json({ requests });
  } catch (e) { next(e); }
};

// MANAGER: list all requests (optionally by status)
exports.listHealthRequests = async (req, res, next) => {
  try {
    if (!["manager", "admin"].includes(req.user.role)) {
      return res.status(403).json({ message: "Manager/Admin only" });
    }

    const { status } = req.query;
    const match = {};
    if (status) match.status = status;

    const pipeline = [
      { $match: match },
      { $sort: { createdAt: -1 } },
      { $lookup: { from: "users", localField: "user", foreignField: "_id", as: "u" } },
      { $unwind: "$u" },
      { $lookup: { from: "elephants", localField: "elephant", foreignField: "_id", as: "e" } },
      { $unwind: "$e" },
      {
        $project: {
          _id: 1, status: 1, note: 1, managerNote: 1, reportUrl: 1, createdAt: 1, respondedAt: 1,
          userId: "$u._id", userName: "$u.name", userEmail: "$u.email",
          elephantId: "$e._id", elephantName: "$e.name", elephantLocation: "$e.location"
        }
      }
    ];

    const requests = await HealthRequest.aggregate(pipeline);
    res.json({ requests });
  } catch (e) { next(e); }
};

// MANAGER: fulfill (upload PDF and mark sent)
exports.fulfillHealthRequest = async (req, res, next) => {
  try {
    if (!["manager", "admin"].includes(req.user.role)) {
      return res.status(403).json({ message: "Manager/Admin only" });
    }
    const { id } = req.params;
    const { managerNote } = req.body;
    if (!req.file) return res.status(400).json({ message: "PDF file is required" });

    const doc = await HealthRequest.findById(id);
    if (!doc) return res.status(404).json({ message: "Request not found" });
    if (doc.status !== "pending") return res.status(400).json({ message: "Only pending requests can be fulfilled" });

    // build public URL for the uploaded file
    const reportUrl = `/uploads/healthreports/${req.file.filename}`;

    doc.status = "fulfilled";
    doc.managerNote = (managerNote || "").trim();
    doc.reportUrl = reportUrl;
    doc.respondedAt = new Date();
    doc.respondedBy = req.user.id;

    await doc.save();
    res.json({ message: "Report uploaded", request: doc });
  } catch (e) { next(e); }
};

// MANAGER: reject a request
exports.rejectHealthRequest = async (req, res, next) => {
  try {
    if (!["manager", "admin"].includes(req.user.role)) {
      return res.status(403).json({ message: "Manager/Admin only" });
    }
    const { id } = req.params;
    const { managerNote } = req.body;

    const doc = await HealthRequest.findById(id);
    if (!doc) return res.status(404).json({ message: "Request not found" });
    if (doc.status !== "pending") return res.status(400).json({ message: "Only pending requests can be rejected" });

    doc.status = "rejected";
    doc.managerNote = (managerNote || "").trim();
    doc.respondedAt = new Date();
    doc.respondedBy = req.user.id;

    await doc.save();
    res.json({ message: "Request rejected", request: doc });
  } catch (e) { next(e); }
};
