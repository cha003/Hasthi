// client/src/api/analytics.js
import axios from "./axios";

// Admin (already present)
export const fetchAnalytics = ({ start, end, months } = {}) => {
  const params = {};
  if (start && end) Object.assign(params, { start, end });
  else if (months) params.months = months;
  return axios.get("/analytics", { params });
};

// NEW: Event analytics (visual only)
export const fetchEventAnalytics = ({ start, end, months } = {}) => {
  const params = {};
  if (start && end) Object.assign(params, { start, end });
  else if (months) params.months = months;
  return axios.get("/event-analytics", { params });
};
export const fetchManagerAnalytics = ({ start, end, months } = {}) => {
  const params = {};
  if (start && end) Object.assign(params, { start, end });
  else if (months) params.months = months;
  return axios.get("/manager-analytics", { params });
};