// server/controllers/aiController.js
const { GoogleGenerativeAI } = require("@google/generative-ai");

function pickModel() {
  const list = (process.env.GEMINI_MODEL || "gemini-2.0-flash").split(",").map(s => s.trim());
  return list.find(Boolean) || "gemini-2.0-flash";
}

exports.health = (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY; // optional fallback
  res.json({
    ok: !!apiKey,
    hasKey: !!apiKey,
    model: pickModel(),
    envVar: apiKey ? (process.env.GEMINI_API_KEY ? "GEMINI_API_KEY" : "GOOGLE_GENERATIVE_AI_API_KEY") : null
  });
};

exports.summarize = async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY; // optional fallback
    if (!apiKey) {
      return res.status(400).json({ ok: false, message: "AI key not configured on server" });
    }

    const { report } = req.body || {};
    if (!report) {
      return res.status(400).json({ ok: false, message: "Missing report payload" });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: pickModel() });

    const prompt = `Summarize this analytics report for a non-technical admin. 
Use short bullet points, avoid jargon, and call out trends and anomalies.
Keep it under 100 words.

Report JSON:
${JSON.stringify(report)}`;

    const result = await model.generateContent(prompt);
    const text = result?.response?.text?.() || result?.response?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    if (!text) throw new Error("Empty response from Gemini");

    res.json({ ok: true, summary: text });
  } catch (err) {
    console.error("Gemini summarize error:", err?.response?.data || err);
    res.status(500).json({ ok: false, message: "Gemini request failed" });
  }
};
