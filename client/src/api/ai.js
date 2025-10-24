// client/src/api/ai.js
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api",
  withCredentials: true,
});

export async function summarizeAnalytics(report) {
  // IMPORTANT: server expects { report: ... }
  return api.post("/ai/summarize", { report });
}
