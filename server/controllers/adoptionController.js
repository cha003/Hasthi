const mongoose = require("mongoose");
const AdoptionRequest = require("../models/AdoptionRequest");
const Elephant = require("../models/Elephant");
const User = require("../models/User");

// --- NEW: email + certificate generator ---
const { sendMail } = require("../utils/mailer");
const { generateAdoptionCertificate } = require("../utils/certificate");

// User (role: "user"): create adoption request
exports.requestAdoption = async (req, res, next) => {
  try {
    if (req.user.role !== "user") {
      return res.status(403).json({ message: "Only users can request adoption" });
    }
    const { elephantId, note } = req.body;
    if (!elephantId) return res.status(400).json({ message: "elephantId is required" });

    const ele = await Elephant.findById(elephantId).lean();
    if (!ele) return res.status(404).json({ message: "Elephant not found" });
    if (ele.adopter) return res.status(400).json({ message: "Elephant already adopted" });

    // prevent duplicate pending request for same user-elephant
    const existing = await AdoptionRequest.findOne({
      user: req.user.id,
      elephant: elephantId,
      status: "pending",
    }).lean();
    if (existing) return res.status(400).json({ message: "You already have a pending request for this elephant" });

    const reqDoc = await AdoptionRequest.create({
      user: req.user.id,
      elephant: elephantId,
      note: (note || "").trim(),
    });

    res.status(201).json({ request: reqDoc });
  } catch (e) { next(e); }
};

// Admin: list requests (optionally by status)
exports.listRequests = async (req, res, next) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ message: "Admin only" });
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
          _id: 1, status: 1, note: 1, createdAt: 1, updatedAt: 1,
          userId: "$u._id", userName: "$u.name", userEmail: "$u.email",
          elephantId: "$e._id", elephantName: "$e.name", elephantLocation: "$e.location",
          // --- NEW: expose certificate meta when present ---
          certificateUrl: 1,
          certificateIssuedAt: 1,
        }
      }
    ];

    const requests = await AdoptionRequest.aggregate(pipeline);
    res.json({ requests });
  } catch (e) { next(e); }
};

// Admin: approve
exports.approveRequest = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    if (req.user.role !== "admin") {
      await session.abortTransaction(); session.endSession();
      return res.status(403).json({ message: "Admin only" });
    }

    const { id } = req.params;
    const reqDoc = await AdoptionRequest.findById(id).session(session);
    if (!reqDoc) { await session.abortTransaction(); session.endSession(); return res.status(404).json({ message: "Request not found" }); }
    if (reqDoc.status !== "pending") { await session.abortTransaction(); session.endSession(); return res.status(400).json({ message: "Only pending requests can be approved" }); }

    const ele = await Elephant.findById(reqDoc.elephant).session(session);
    if (!ele) { await session.abortTransaction(); session.endSession(); return res.status(404).json({ message: "Elephant not found" }); }
    if (ele.adopter) { await session.abortTransaction(); session.endSession(); return res.status(400).json({ message: "Elephant already adopted" }); }

    // assign adopter
    ele.adopter = reqDoc.user;
    ele.adoptedAt = new Date();
    await ele.save({ session });

    reqDoc.status = "approved";
    await reqDoc.save({ session });

    // Optional: auto-reject other pending requests for this elephant
    await AdoptionRequest.updateMany(
      { _id: { $ne: reqDoc._id }, elephant: ele._id, status: "pending" },
      { $set: { status: "rejected" } },
      { session }
    );

    await session.commitTransaction(); session.endSession();

    // --- NEW: generate certificate + email (best-effort; won't block success) ---
    (async () => {
      try {
        const adopter = await User.findById(reqDoc.user).lean();
        const issuedAt = new Date();

        const { relativeUrl, filename } = await generateAdoptionCertificate({
          user: { name: adopter?.name || adopter?.email || "Adopter", email: adopter?.email || "" },
          elephant: { name: ele.name, location: ele.location || "" },
          requestId: String(reqDoc._id),
          issuedAt,
        });

        // store metadata
        await AdoptionRequest.findByIdAndUpdate(reqDoc._id, {
          $set: { certificateUrl: relativeUrl, certificateIssuedAt: issuedAt }
        });

        const absoluteLink = `${(req.protocol || "http")}://${req.get("host")}${relativeUrl}`;

        // email the adopter
        await sendMail({
          to: adopter.email,
          subject: `Hasthi.lk – Adoption Certificate for ${ele.name}`,
          text:
`Dear ${adopter.name || "Supporter"},

Thank you for adopting ${ele.name}! Your certificate is attached and can also be downloaded from:
${absoluteLink}

With gratitude,
Hasthi.lk Team`,
          html:
`<p>Dear <strong>${adopter.name || "Supporter"}</strong>,</p>
<p>Thank you for adopting <strong>${ele.name}</strong>! Your certificate is attached and can also be downloaded from the link below.</p>
<p><a href="${absoluteLink}" target="_blank" rel="noreferrer">Download Adoption Certificate</a></p>
<p>With gratitude,<br/>Hasthi.lk Team</p>`,
          attachments: [
            {   // attach the generated PDF
              filename,
              path: absoluteLink, // since /uploads is publicly served
            }
          ]
        });
      } catch (err) {
        console.error("⚠️ Failed to generate/send adoption certificate:", err?.message || err);
      }
    })();

    res.json({ message: "Adoption approved", requestId: reqDoc._id, elephantId: ele._id, userId: reqDoc.user });
  } catch (e) {
    await session.abortTransaction(); session.endSession();
    next(e);
  }
};

// Admin: reject
exports.rejectRequest = async (req, res, next) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ message: "Admin only" });
    const { id } = req.params;
    const reqDoc = await AdoptionRequest.findById(id);
    if (!reqDoc) return res.status(404).json({ message: "Request not found" });
    if (reqDoc.status !== "pending") return res.status(400).json({ message: "Only pending requests can be rejected" });
    reqDoc.status = "rejected";
    await reqDoc.save();
    res.json({ message: "Adoption request rejected", requestId: reqDoc._id });
  } catch (e) { next(e); }
};

// User: list my requests
exports.listMyRequests = async (req, res, next) => {
  try {
    if (req.user.role !== "user") return res.status(403).json({ message: "User only" });
    const pipeline = [
      { $match: { user: new mongoose.Types.ObjectId(req.user.id) } },
      { $sort: { createdAt: -1 } },
      { $lookup: { from: "elephants", localField: "elephant", foreignField: "_id", as: "e" } },
      { $unwind: "$e" },
      { $project: { _id: 1, status: 1, note: 1, createdAt: 1, elephantId: "$e._id", elephantName: "$e.name",
        // --- NEW: expose certificate meta if approved ---
        certificateUrl: 1, certificateIssuedAt: 1
      } }
    ];
    const requests = await AdoptionRequest.aggregate(pipeline);
    res.json({ requests });
  } catch (e) { next(e); }
};

// NEW: User: list my adopted elephants (unchanged original behavior)
exports.listMyAdoptedElephants = async (req, res, next) => {
  try {
    if (req.user.role !== "user") return res.status(403).json({ message: "User only" });

    const elephants = await Elephant.find({ adopter: req.user.id })
      .select("_id name age gender location notes adoptedAt")
      .sort({ adoptedAt: -1, createdAt: -1 })
      .lean();

    res.json({ elephants });
  } catch (e) { next(e); }
};

// --- NEW: User certificates list (per-elephant mapping) ---
exports.listMyCertificates = async (req, res, next) => {
  try {
    if (req.user.role !== "user") return res.status(403).json({ message: "User only" });
    const rows = await AdoptionRequest.aggregate([
      { $match: {
          user: new mongoose.Types.ObjectId(req.user.id),
          status: "approved",
          certificateUrl: { $ne: null }
        }
      },
      { $lookup: { from: "elephants", localField: "elephant", foreignField: "_id", as: "e" } },
      { $unwind: "$e" },
      { $project: {
          requestId: "$_id",
          elephantId: "$e._id",
          elephantName: "$e.name",
          certificateUrl: 1,
          certificateIssuedAt: 1
        }
      },
      { $sort: { certificateIssuedAt: -1, createdAt: -1 } }
    ]);
    res.json({ certificates: rows });
  } catch (e) { next(e); }
};

// --- NEW: secure download by request id (admin or owner) ---
exports.getCertificateByRequest = async (req, res, next) => {
  try {
    const { id } = req.params; // adoption request id
    const doc = await AdoptionRequest.findById(id).lean();
    if (!doc || !doc.certificateUrl) return res.status(404).json({ message: "Certificate not found" });

    // permission: admin or owner only
    if (req.user.role !== "admin" && String(doc.user) !== String(req.user.id)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    // since /uploads is already static-served, we can redirect to file
    return res.redirect(doc.certificateUrl);
  } catch (e) { next(e); }
};
