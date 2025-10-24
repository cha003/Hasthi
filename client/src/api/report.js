// client/src/api/report.js
import client from "./client";
import api from "./axios";

export const createReport = (payload) => client.post("/reports", payload);

/**
 * Get my reports (caretaker).
 * params: { q?: string, start?: "YYYY-MM-DD", end?: "YYYY-MM-DD" }
 */
export const fetchMyReports = (params = {}) =>
  client.get("/reports/mine", { params });

export async function downloadMonthlyInvoice(year, month) {
  const resp = await api.get(`/reports/invoice/${year}/${String(month).padStart(2,"0")}.pdf`, {
    responseType: "blob"
  });
  return resp.data; // Blob
}