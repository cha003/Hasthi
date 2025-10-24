// client/src/api/entry.js
import api from "./axios";

// Inventory (admin create/update, public list)
export const upsertInventory = (payload) =>
  api.post("/entry/inventory", payload).then(r => r.data);

export const listInventory = (params = {}) =>
  api.get("/entry/inventory", { params }).then(r => r.data);

// Bookings
export const createEntryBooking = (payload) =>
  api.post("/entry/bookings", payload).then(r => r.data);

export const myEntryBookings = () =>
  api.get("/entry/bookings/me").then(r => r.data);

export const getEntryBooking = (id) =>
  api.get(`/entry/bookings/${id}`).then(r => r.data);

export const payEntryBooking = (id) =>
  api.patch(`/entry/bookings/${id}/pay`).then(r => r.data);

export const cancelEntryBooking = (id) =>
  api.patch(`/entry/bookings/${id}/cancel`).then(r => r.data);

export const getEntryTicketToken = (id) =>
  api.get(`/entry/bookings/${id}/ticket-token`).then(r => r.data);

// public/staff (if you build those UIs)
export const resolveEntryTicketPublic = (token) =>
  api.post("/entry/bookings/resolve", { token }).then(r => r.data);

export const verifyEntryTicket = (token) =>
  api.post("/entry/bookings/verify", { token }).then(r => r.data);

// NEW: Event Manager — list entry bookings ledger (server restricts scope)
export const listEntryBookingsManage = (params = {}) =>
  api.get("/entry/bookings/manage", { params }).then(r => r.data);
