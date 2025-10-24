// client/src/api/user.js
import client from "./client";

export const fetchMe = () => client.get("/users/me");
export const updateMe = (payload) => client.patch("/users/me", payload);
export const uploadAvatar = (file) => {
  const fd = new FormData();
  fd.append("avatar", file);
  return client.patch("/users/me/avatar", fd, {
    headers: { "Content-Type": "multipart/form-data" }
  });
};
export const changePassword = (payload) => client.patch("/users/me/password", payload);
export const deleteMe = () => client.delete("/users/me");
