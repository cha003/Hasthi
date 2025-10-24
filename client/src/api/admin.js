// client/src/api/admin.js
import client from "./client";

// users
export const fetchUsers = (role) => client.get("/admin/users", { params: role ? { role } : {} });
export const updateUserRole = (id, role) => client.patch(`/admin/users/${id}/role`, { role });
export const deleteUser = (id) => client.delete(`/admin/users/${id}`);

// elephants (admin assign)
export const assignCaretaker = (elephantId, caretakerId) =>
  client.patch(`/elephants/${elephantId}/assign`, { caretakerId });
