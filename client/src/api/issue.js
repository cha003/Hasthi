// client/src/api/issue.js
import client from "./client";

export const createIssue = (payload) => {
  // payload: { elephantId, description, file? }
  if (payload?.file) {
    const fd = new FormData();
    fd.append("elephantId", payload.elephantId);
    fd.append("description", payload.description);
    fd.append("image", payload.file);
    return client.post("/issues", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  }
  return client.post("/issues", payload);
};

export const fetchAllIssues = () => client.get("/issues");               // vet
export const fetchMyIssues = (params = {}) => client.get("/issues/mine", { params }); // caretaker

export const uploadPrescription = (issueId, { note, file }) => {
  const fd = new FormData();
  if (note) fd.append("note", note);
  if (file) fd.append("file", file);
  return client.patch(`/issues/${issueId}/prescription`, fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const getPrescriptionDownloadUrl = (issueId) =>
  client.get(`/issues/${issueId}/prescription/download`);
