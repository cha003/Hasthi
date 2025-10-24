import client from "./client";

export const createElephant = (payload) => {
  // Allow both FormData (preferred) and JSON fallback
  if (payload instanceof FormData) {
    return client.post("/elephants", payload, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  }
  return client.post("/elephants", payload);
};

export const fetchElephants = () => client.get("/elephants");
export const updateElephant = (id, payload) => client.patch(`/elephants/${id}`, payload);
export const deleteElephant = (id) => client.delete(`/elephants/${id}`);
export const fetchMyElephants = () => client.get("/elephants/mine/list");
export const getAdoptableElephants = () => client.get("/elephants/adoptables");
