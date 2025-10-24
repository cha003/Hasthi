// client/src/components/EventManagerRoute.jsx
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthProvider";

export default function EventManagerRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding: 24 }}>Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "eventmanager" && user.role !== "admin") {
    return <div style={{ padding: 24, color: "crimson" }}>Forbidden</div>;
  }
  return children;
}
