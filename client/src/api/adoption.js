import client from "./client";

// user
export const requestAdoption = (payload) => client.post("/adoptions", payload);
export const fetchMyAdoptionRequests = () => client.get("/adoptions/mine");
export const fetchMyAdoptedElephants = () => client.get("/adoptions/mine/elephants"); // <-- added

export const fetchMyCertificates = () => client.get("/adoptions/mine/certificates");

// admin
export const fetchAdoptionRequests = (params = {}) => client.get("/adoptions", { params });
export const approveAdoptionRequest = (id) => client.patch(`/adoptions/${id}/approve`);
export const rejectAdoptionRequest = (id) => client.patch(`/adoptions/${id}/reject`);
