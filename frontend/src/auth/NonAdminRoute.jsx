import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

/**
 * Route guard that ensures logged-in administrators cannot access member or guest pages,
 * redirecting them directly to their admin console home page.
 */
export default function NonAdminRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (user?.role === "admin") {
    return <Navigate to="/admin" replace />;
  }
  return children;
}

