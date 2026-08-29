import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

/** Wrap a route element; optionally restrict to a list of roles (e.g. ["admin"]). */
export default function ProtectedRoute({ children, roles }) {
  const { token, user, loading } = useAuth();

  if (loading) return null;
  if (!token) return <Navigate to="/login" replace />;
  if (roles && user?.role && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  return children;
}
