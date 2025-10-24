// client/src/api/auth.js
import client from "./client";

export const apiRegister = (payload) => client.post("/auth/register", payload);
export const apiLogin = (payload) => client.post("/auth/login", payload);
export const apiMe = () => client.get("/auth/me");
export const apiLogout = () => client.post("/auth/logout");
