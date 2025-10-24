// client/src/api/events.js
import api from "./axios";

// Public / shared
export const listEvents = (params = {}) =>
  api.get("/events", { params }).then(r => r.data);

export const getEvent = (id) =>
  api.get(`/events/${id}`).then(r => r.data);

// Admin / Event Manager
export const createEvent = (payload) =>
  api.post("/events", payload).then(r => r.data);

export const updateEvent = (id, payload) =>
  api.put(`/events/${id}`, payload).then(r => r.data);

export const cancelEvent = (id) =>
  api.patch(`/events/${id}/cancel`).then(r => r.data);

export const deleteEvent = (id) =>
  api.delete(`/events/${id}`).then(r => r.data);

// Per-event bookings
export const getEventBookings = (id) =>
  api.get(`/events/${id}/bookings`).then(r => r.data);

// NEW: Event Manager — my events list (with stats on server side)
export const listMyEventsManage = (params = {}) =>
  api.get("/events/manage/list", { params }).then(r => r.data);
