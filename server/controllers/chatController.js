// server/controllers/chatController.js
"use strict";

const {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} = require("@google/generative-ai");

const site = require("../config/siteData");

// ===== Model fallback list =====
const FALLBACK_MODELS = (process.env.GEMINI_MODEL ||
  "gemini-2.5-flash,gemini-2.0-flash,gemini-2.0-flash-lite")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// ===== In-memory sessions =====
const sessions = new Map();
const MAX_TURNS = 16;

function trimHistory(arr) {
  if (arr.length > MAX_TURNS * 2) return arr.slice(-MAX_TURNS * 2);
  return arr;
}

function cryptoRandom() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function isNotFound(err) {
  const s = String(err && (err.status || err.message || err));
  return s.includes("404") || /not[\s-]?found/i.test(s);
}

// ===== Render site facts into concise, model-friendly text =====
function money(n) {
  const val = Number(n || 0);
  if (!Number.isFinite(val) || val <= 0) return "TBA";
  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: site.currency || "LKR",
    maximumFractionDigits: 0,
  }).format(val);
}

function renderPackages(pkgs) {
  if (!Array.isArray(pkgs) || !pkgs.length) return "No packages listed.";
  return pkgs
    .map((p) => {
      const price =
        p.priceLKR > 0
          ? `${money(p.priceLKR)}${p.per ? ` (${p.per})` : ""}`
          : "TBA";
      const inc = Array.isArray(p.includes) ? ` — includes: ${p.includes.join(", ")}` : "";
      return `• ${p.title}: ${price}${inc}`;
    })
    .join("\n");
}

function renderEntryTickets(t) {
  if (!t) return "No entry ticket data.";
  const lines = [];
  if (t.local) {
    const { adult, child, student } = t.local;
    lines.push(
      `Local — Adult: ${money(adult)}, Child: ${money(child)}, Student: ${money(student)}`
    );
  }
  if (t.foreign) {
    const { adult, child, student } = t.foreign;
    lines.push(
      `Foreign — Adult: ${money(adult)}, Child: ${money(child)}, Student: ${money(student)}`
    );
  }
  if (Array.isArray(t.addOns) && t.addOns.length) {
    lines.push(
      `Add-ons — ${t.addOns
        .map((a) => `${a.title}: ${money(a.priceLKR)}`)
        .join(", ")}`
    );
  }
  if (t.notes) lines.push(`Notes — ${t.notes}`);
  return lines.join("\n");
}

function renderAdoption(arr) {
  if (!Array.isArray(arr) || !arr.length) return "";
  return arr
    .map((a) => `• ${a.title}: ${money(a.priceLKR)}${a.includes?.length ? ` — ${a.includes.join(", ")}` : ""}`)
    .join("\n");
}

function renderDonations(arr) {
  if (!Array.isArray(arr) || !arr.length) return "";
  return arr
    .map((d) =>
      d.priceLKR > 0 ? `• ${d.title}: ${money(d.priceLKR)}` : `• ${d.title}: any amount`
    )
    .join("\n");
}

function buildSystemInstruction(userName = "visitor") {
  // Keep this brief but complete; model sees this every request.
  const parts = [];

  parts.push(
    `You are Hasthi.lk's assistant for an Elephant Orphanage platform. Be concise, friendly, action-oriented. Prefer answers in 1–3 short sentences.`
  );
  parts.push(
    `Use ONLY the official site facts below. If something isn't in the facts, say you don't have that info yet and suggest checking the site or contacting staff.`
  );
  parts.push(
    `Use site terms: Entry Ticket, Adoption, Donation, Event Calendar, Packages. Prices in ${site.currency || "LKR"}; do not convert unless asked.`
  );
  parts.push(
    `Safety: If asked to do something dangerous/illegal or for medical diagnosis, politely refuse and suggest contacting site staff/veterinarian.`
  );

  // Facts
  parts.push(`\n=== OFFICIAL SITE FACTS (v${site.kbVersion || "1.0"}) ===`);
  parts.push(`Brand: ${site.brandName}`);
  if (site.contact?.phone) parts.push(`Phone: ${site.contact.phone}`);
  if (site.contact?.email) parts.push(`Email: ${site.contact.email}`);
  if (site.location?.name) {
    parts.push(
      `Location: ${site.location.name}${
        site.location.address ? ` — ${site.location.address}` : ""
      }${
        site.location.map
          ? ` — Coords: ${site.location.map.lat}, ${site.location.map.lng}`
          : ""
      }${site.location.openHours ? ` — Hours: ${site.location.openHours}` : ""}`
    );
  }
  if (site.location?.notes) parts.push(`Location notes: ${site.location.notes}`);

  parts.push(`\nPackages:\n${renderPackages(site.packages)}`);

  parts.push(`\nEntry Tickets:\n${renderEntryTickets(site.entryTickets)}`);

  if (site.adoption?.length) parts.push(`\nAdoption:\n${renderAdoption(site.adoption)}`);
  if (site.donations?.length) parts.push(`\nDonations:\n${renderDonations(site.donations)}`);

  parts.push(`\nAnswer style: bullet points when listing, otherwise one or two short sentences.`);

  return parts.join("\n");
}

// ===== Main handler =====
exports.chat = async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "GEMINI_API_KEY not set" });

    const { conversationId, message, system, userName } = req.body || {};
    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "message is required" });
    }

    // Session
    const id = conversationId || cryptoRandom();
    if (!sessions.has(id)) sessions.set(id, []);
    const history = sessions.get(id);

    // Push user turn
    history.push({ role: "user", parts: [{ text: message }] });
    const pruned = trimHistory(history);
    sessions.set(id, pruned);

    // Gen AI client
    const genAI = new GoogleGenerativeAI(apiKey);
    const sys = system || buildSystemInstruction(userName);

    const safetySettings = [
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    ];

    const generationConfig = {
      temperature: 0.4, // slightly lower for factual tone
      topP: 0.9,
      topK: 40,
      maxOutputTokens: 512,
    };

    // Try fallback models
    let text = null, usedModel = null, lastErr = null, tried = [];

    for (const modelName of FALLBACK_MODELS) {
      tried.push(modelName);
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          systemInstruction: sys,
        });

        const result = await model.generateContent({
          contents: pruned,
          safetySettings,
          generationConfig,
        });

        text =
          (typeof result?.response?.text === "function"
            ? result.response.text()
            : result?.response?.candidates?.[0]?.content?.parts?.[0]?.text) || "";

        text = text.trim() || "(No response)";
        usedModel = modelName;
        break;
      } catch (e) {
        lastErr = e;
        if (isNotFound(e)) continue; // try next model if retired/not enabled
        break; // other errors: stop
      }
    }

    if (!text) {
      const msg = (lastErr && (lastErr.message || String(lastErr))) || "Failed to generate response";
      return res.status(lastErr?.status || 500).json({ error: msg, triedModels: tried });
    }

    // Save model turn and reply
    pruned.push({ role: "model", parts: [{ text }] });
    sessions.set(id, pruned);

    res.json({ conversationId: id, reply: text, model: usedModel });
  } catch (err) {
    console.error("Gemini chat error:", err);
    res.status(500).json({ error: err?.message || "Failed to generate response" });
  }
};
