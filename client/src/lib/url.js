// Builds an absolute URL for files served by the API server
// Works for both absolute and relative baseURL values (e.g., "http://localhost:5000/api" or "/api")
import client from "../api/client";

export function fileUrl(p) {
  if (!p) return "";
  if (/^https?:\/\//i.test(p)) return p; // already absolute

  const base = client?.defaults?.baseURL || "";
  let origin = "";

  // If baseURL is absolute, use its origin (e.g., http://localhost:5000)
  try {
    if (/^https?:\/\//i.test(base)) {
      origin = new URL(base).origin;
    }
  } catch (_) {}

  // Allow explicit override via env if you proxy only /api (not /uploads) in dev
  if (!origin && import.meta?.env?.VITE_API_ORIGIN) {
    origin = import.meta.env.VITE_API_ORIGIN.replace(/\/$/, "");
  }

  // Fallback to current origin (works when front+back are served from same host in prod)
  if (!origin) {
    origin = window.location.origin;
  }

  const path = p.startsWith("/") ? p : `/${p}`;
  return `${origin}${path}`;
}
