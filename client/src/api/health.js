import client from "./client";

// user
export const requestHealthReport = ({ elephantId, note = "" }) =>
  client.post("/health-requests", { elephantId, note });
export const fetchMyHealthRequests = (params = {}) =>
  client.get("/health-requests/mine", { params });

// manager
export const fetchHealthRequests = (params = {}) =>
  client.get("/health-requests", { params });
export const fulfillHealthRequest = (id, formData) =>
  client.patch(`/health-requests/${id}/fulfill`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
export const rejectHealthRequest = (id, payload = {}) =>
  client.patch(`/health-requests/${id}/reject`, payload);
