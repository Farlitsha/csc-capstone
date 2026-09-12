import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

/** Wrap a route element; optionally restrict to a list of roles (e.g. ["admin"]). */
export default function ProtectedRoute({ children, roles, redirectTo }) {
  const { token, user, loading } = useAuth();

  if (loading) return null;
  const isAdminOnly = roles?.length === 1 && roles[0] === "admin";
  const unauthenticatedRedirect = redirectTo || (isAdminOnly ? "/admin/login" : "/login");

  if (!token) return <Navigate to={unauthenticatedRedirect} replace />;
  if (roles && user?.role && !roles.includes(user.role)) {
    return <Navigate to={isAdminOnly ? "/admin/login" : "/"} replace />;
  }
  return children;
}
