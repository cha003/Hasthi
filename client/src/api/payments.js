// client/src/api/payments.js
import api from "./axios";

// ✅ accept payload with overrides so server never has to guess
export const createEventCheckout = (id, payload = {}) =>
  api.post(`/payments/checkout/event/${id}`, payload).then(r => r.data);

export const confirmEventPayment = (id, sessionId) =>
  api.post(`/payments/confirm/event/${id}`, { sessionId }).then(r => r.data);

export const createEntryCheckout = (id) =>
  api.post(`/payments/checkout/entry/${id}`).then(r => r.data);

export const confirmEntryPayment = (id, sessionId) =>
  api.post(`/payments/confirm/entry/${id}`, { sessionId }).then(r => r.data);

export const createDonationCheckout = (payload) =>
  api.post(`/payments/checkout/donation`, payload).then(r => r.data);
