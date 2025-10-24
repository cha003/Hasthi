// client/src/components/VetRoute.jsx
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthProvider";

export default function VetRoute({ children }) {
  const { user, ready } = useAuth();
  if (!ready) return <div style={{ padding: 16 }}>Loading...</div>;
  if (!user || user.role !== "veterinarian") return <Navigate to="/" replace />;
  return children;
}
