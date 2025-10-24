// client/src/components/AdminRoute.jsx
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthProvider";

export default function AdminRoute({ children }) {
  const { user, ready } = useAuth();
  if (!ready) return <div style={{ padding: 16 }}>Loading...</div>;
  if (!user || user.role !== "admin") return <Navigate to="/" replace />;
  return children;
}
