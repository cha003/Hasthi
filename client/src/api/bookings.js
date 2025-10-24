import api from "./axios";

// Create a booking for an event
export const createBooking = (payload) =>
  api.post("/bookings", payload).then((r) => r.data);

// Read one booking (populated with event fields)
export const getBooking = (id) =>
  api.get(`/bookings/${id}`).then((r) => r.data);

// Current user's bookings
export const myBookings = () =>
  api.get("/bookings/me").then((r) => r.data);

// Cancel a pending (unpaid) booking
export const cancelBooking = (id) =>
  api.patch(`/bookings/${id}/cancel`).then((r) => r.data);

// Alias kept for older imports
export const cancelMyBooking = (id) => cancelBooking(id);

// Mark booking as paid
export const payBooking = (id) =>
  api.patch(`/bookings/${id}/pay`).then((r) => r.data);

// Get an e-ticket token
export const getTicketToken = (id) =>
  api.get(`/bookings/${id}/ticket-token`).then((r) => r.data);

// NEW: Event Manager — all bookings across *my* events
export const listBookingsForMyEvents = (params = {}) =>
  api.get("/bookings/manage/my-events", { params }).then((r) => r.data);

// NEW: Get event details by ID
export const getEvent = (eventId) => 
  api.get(`/events/${eventId}`).then((r) => r.data);
