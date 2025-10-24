// client/src/api/client.js
import axios from "axios";

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  withCredentials: true // important for http-only cookie
});

// (optional) handle 401 globally
client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      // You could redirect to /login or clear auth
      // window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

// optional auth header if you store a token
client.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default client;
