// controllers/contact.controller.js
import ContactMessage from "../models/ContactMessage.js";

/**
 * POST /api/contact
 * Public: create a new contact message
 */
export const createContact = async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;
    const doc = await ContactMessage.create({ name, email, phone, subject, message });
    res.status(201).json({ ok: true, data: doc });
  } catch (err) {
    console.error("createContact error:", err);
    res.status(500).json({ ok: false, error: "Failed to submit message" });
  }
};

/**
 * GET /api/contact
 * Admin: list contact messages with pagination + filters + search
 * Query: page, limit, status, q (text search), sort (e.g. -createdAt)
 */
export const listContacts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      q,
      sort = "-createdAt",
    } = req.query;

    const query = {};
    if (status) query.status = status;
    if (q) query.$text = { $search: q };

    const skip = (Number(page) - 1) * Number(limit);

    const [items, total] = await Promise.all([
      ContactMessage.find(query).sort(sort).skip(skip).limit(Number(limit)),
      ContactMessage.countDocuments(query),
    ]);

    res.json({
      ok: true,
      data: items,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    console.error("listContacts error:", err);
    res.status(500).json({ ok: false, error: "Failed to fetch messages" });
  }
};

/**
 * GET /api/contact/:id
 * Admin: read single message
 */
export const getContact = async (req, res) => {
  try {
    const doc = await ContactMessage.findById(req.params.id);
    if (!doc) return res.status(404).json({ ok: false, error: "Not found" });
    res.json({ ok: true, data: doc });
  } catch (err) {
    console.error("getContact error:", err);
    res.status(500).json({ ok: false, error: "Failed to fetch message" });
  }
};

/**
 * PATCH /api/contact/:id/status
 * Admin: update status and optional notes
 * Body: { status, notes }
 */
export const updateStatus = async (req, res) => {
  try {
    const { status, notes } = req.body;
    const update = {};
    if (status) update.status = status;
    if (notes !== undefined) update.notes = notes;
    if (req.user?._id) update.handledBy = req.user._id;

    const doc = await ContactMessage.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { new: true }
    );
    if (!doc) return res.status(404).json({ ok: false, error: "Not found" });
    res.json({ ok: true, data: doc });
  } catch (err) {
    console.error("updateStatus error:", err);
    res.status(500).json({ ok: false, error: "Failed to update status" });
  }
};

/**
 * DELETE /api/contact/:id
 * Admin: delete a message (optional)
 */
export const removeContact = async (req, res) => {
  try {
    const doc = await ContactMessage.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ ok: false, error: "Not found" });
    res.json({ ok: true, data: doc._id });
  } catch (err) {
    console.error("removeContact error:", err);
    res.status(500).json({ ok: false, error: "Failed to delete" });
  }
};
