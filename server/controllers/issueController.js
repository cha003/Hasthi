// server/controllers/issueController.js
const mongoose = require("mongoose");
const Issue = require("../models/Issue");
const Elephant = require("../models/Elephant");
const User = require("../models/User");
const { sendMail } = require("../utils/mailer");
const { uploadBuffer, destroyByPublicId, cloudinary } = require("../utils/cloudinary");

// Caretaker: create issue (+ optional photo + email veterinarians)
exports.createIssue = async (req, res, next) => {
  try {
    const { elephantId, description } = req.body;
    if (!elephantId || !description?.trim()) {
      return res.status(400).json({ message: "elephantId and description are required" });
    }

    const ele = await Elephant.findOne({ _id: elephantId, caretaker: req.user.id }).lean();
    if (!ele) return res.status(403).json({ message: "You are not assigned to this elephant" });

    // create the issue first (without photo)
    const issue = await Issue.create({
      elephant: elephantId,
      caretaker: req.user.id,
      description: description.trim(),
    });

    // optional image upload
    if (req.file) {
      const mime = req.file.mimetype || "";
      if (!mime.startsWith("image/")) {
        return res.status(400).json({ message: "Only image files are allowed" });
      }

      const uploaded = await uploadBuffer(req.file.buffer, {
        folder: "hasthi/issues",
        public_id: `issue-${issue._id}-photo`,
      });

      issue.photo = {
        url: uploaded.secure_url,
        publicId: uploaded.public_id,
        format: uploaded.format,
        resourceType: uploaded.resource_type,
        uploadedAt: new Date(),
      };
      await issue.save();
    }

    res.status(201).json({ issue });

    // Email vets (non-blocking)
    try {
      const vets = await User.find({ role: "veterinarian" }).select("email name").lean();
      const recipients = vets.map(v => v.email).filter(Boolean);
      if (!recipients.length) return;

      const caretaker = await User.findById(req.user.id).select("name email").lean();
      const appName = process.env.APP_NAME || "Hasthi.lk";
      const subject = `[${appName}] New Issue Reported — ${ele.name}${ele.location ? ` (${ele.location})` : ""}`;

      const createdAt = new Date(issue.createdAt).toLocaleString();
      const eleIdShort = String(ele._id).slice(-6).toUpperCase();

      const text = `
A new issue has been reported.

Elephant: ${ele.name} [${eleIdShort}]
Location: ${ele.location || "-"}

Description:
${description.trim()}

Reported by: ${caretaker?.name || "Caretaker"} (${caretaker?.email || "-"})
Date: ${createdAt}
${issue.photo?.url ? `\nPhoto: ${issue.photo.url}\n` : ""}
      `.trim();

      const html = `
<h2 style="margin:0 0 8px 0;">New Issue Reported</h2>
<p style="margin:0 0 8px 0;"><b>Elephant:</b> ${ele.name} <small>[${eleIdShort}]</small></p>
<p style="margin:0 0 8px 0;"><b>Location:</b> ${ele.location || "-"}</p>
<p style="margin:0 0 8px 0;"><b>Description:</b></p>
<pre style="background:#f6f8fa;padding:12px;border-radius:6px;white-space:pre-wrap;">${escapeHtml(description.trim())}</pre>
<p style="margin:8px 0 0 0;"><b>Reported by:</b> ${caretaker?.name || "Caretaker"} &lt;${caretaker?.email || "-"}&gt;</p>
<p style="margin:4px 0 0 0;"><b>Date:</b> ${createdAt}</p>
${issue.photo?.url ? `<p style="margin:8px 0 0 0;"><b>Photo:</b> <a href="${issue.photo.url}">${issue.photo.url}</a></p>` : ""}
      `.trim();

      await sendMail({ to: recipients, subject, text, html });
    } catch (mailErr) {
      console.error("Email alert failed:", mailErr);
    }
  } catch (e) {
    next(e);
  }
};

// Veterinarian: upload prescription (note + file) to an issue
exports.uploadPrescription = async (req, res, next) => {
  try {
    const { id } = req.params; // issue id
    const note = (req.body.note || "").toString();

    const issue = await Issue.findById(id);
    if (!issue) return res.status(404).json({ message: "Issue not found" });

    if (!req.file) return res.status(400).json({ message: "File is required" });
    const mime = req.file.mimetype || "";
    const isImage = mime.startsWith("image/");
    const isPdf = mime === "application/pdf";
    if (!isImage && !isPdf) {
      return res.status(400).json({ message: "Only image or PDF allowed" });
    }

    // upload to Cloudinary
    const publicIdBase = `issue-${issue._id}-${Date.now()}`;
    const uploaded = await uploadBuffer(req.file.buffer, {
      folder: "hasthi/prescriptions",
      public_id: publicIdBase,
    });

    // if previously existed, clean up
    if (issue.prescription?.publicId) {
      const oldType = issue.prescription.resourceType || "image";
      destroyByPublicId(issue.prescription.publicId, oldType).catch(() => {});
    }

    issue.prescription = {
      note: note?.trim() || "",
      url: uploaded.secure_url,
      publicId: uploaded.public_id,
      format: uploaded.format,
      resourceType: uploaded.resource_type, // image | raw
      uploadedBy: req.user.id,
      uploadedAt: new Date(),
    };
    await issue.save();

    res.json({
      message: "Prescription uploaded",
      issueId: issue._id,
      prescription: issue.prescription,
    });
  } catch (e) {
    next(e);
  }
};

// Signed download URL for prescription (unchanged from your working version)
exports.getPrescriptionDownloadUrl = async (req, res, next) => {
  try {
    const { id } = req.params; // issue id
    const issue = await Issue.findById(id).select("caretaker prescription").lean();
    if (!issue || !issue.prescription?.publicId) {
      return res.status(404).json({ message: "Prescription not found" });
    }

    const isCaretakerOwner = String(issue.caretaker) === String(req.user.id);
    const isVet = req.user.role === "veterinarian";
    const isAdmin = req.user.role === "admin";
    if (!isCaretakerOwner && !isVet && !isAdmin) {
      return res.status(403).json({ message: "Not allowed" });
    }

    const resourceType = issue.prescription.resourceType || "image";
    const deliveryType = issue.prescription.deliveryType || "upload";
    const format = issue.prescription.format || undefined;
    const version = issue.prescription.version;
    const expiresAt = Math.floor(Date.now() / 1000) + 5 * 60;

    let url;
    if (deliveryType === "authenticated" || deliveryType === "private") {
      url = cloudinary.utils.private_download_url(
        issue.prescription.publicId,
        format,
        {
          resource_type: resourceType,
          type: deliveryType,
          attachment: true,
          expires_at: expiresAt,
        }
      );
    } else {
      url = cloudinary.url(issue.prescription.publicId, {
        resource_type: resourceType,
        type: "upload",
        secure: true,
        sign_url: true,
        expires_at: expiresAt,
        flags: "attachment",
        format,
        version,
      });
    }

    return res.json({ url, expiresAt });
  } catch (e) {
    next(e);
  }
};

// Veterinarian: list all issues (include photo)
exports.listAllIssues = async (req, res, next) => {
  try {
    const pipeline = [
      { $sort: { createdAt: -1 } },
      { $lookup: { from: "elephants", localField: "elephant", foreignField: "_id", as: "ele" } },
      { $unwind: "$ele" },
      { $lookup: { from: "users", localField: "caretaker", foreignField: "_id", as: "ct" } },
      { $unwind: "$ct" },
      {
        $project: {
          _id: 1,
          description: 1,
          createdAt: 1,
          photo: 1,          // NEW
          prescription: 1,
          elephantId: "$ele._id",
          elephantName: "$ele.name",
          elephantLocation: "$ele.location",
          caretakerId: "$ct._id",
          caretakerName: "$ct.name",
          caretakerEmail: "$ct.email",
        },
      },
    ];

    const issues = await Issue.aggregate(pipeline);
    res.json({ issues });
  } catch (e) {
    next(e);
  }
};

// Caretaker: list my issues (include photo)
exports.listMyIssues = async (req, res, next) => {
  try {
    const { elephantId } = req.query;
    const match = { caretaker: new mongoose.Types.ObjectId(req.user.id) };
    if (elephantId) match.elephant = new mongoose.Types.ObjectId(elephantId);

    const pipeline = [
      { $match: match },
      { $sort: { createdAt: -1 } },
      { $lookup: { from: "elephants", localField: "elephant", foreignField: "_id", as: "ele" } },
      { $unwind: "$ele" },
      {
        $project: {
          _id: 1,
          description: 1,
          createdAt: 1,
          photo: 1,        // NEW
          prescription: 1,
          elephantId: "$ele._id",
          elephantName: "$ele.name",
          elephantLocation: "$ele.location",
        },
      },
    ];

    const issues = await Issue.aggregate(pipeline);
    res.json({ issues });
  } catch (e) {
    next(e);
  }
};

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
