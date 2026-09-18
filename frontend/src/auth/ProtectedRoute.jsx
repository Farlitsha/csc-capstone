import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { isPhoneScreen } from "../hooks/useIsPhone";

/** Wrap a route element; optionally restrict to a list of roles (e.g. ["admin"]). */
export default function ProtectedRoute({ children, roles, redirectTo }) {
  const { token, user, loading } = useAuth();

  if (loading) return null;
  const isAdminOnly = roles?.length === 1 && roles[0] === "admin";
  const unauthenticatedRedirect = redirectTo || (isAdminOnly ? "/admin/login" : "/login");

  if (!token) return <Navigate to={unauthenticatedRedirect} replace />;
  if (roles && user?.role && !roles.includes(user.role)) {
    return <Navigate to={isAdminOnly ? "/admin/login" : (user.role === "admin" ? "/admin" : "/")} replace />;
  }
  // Admin is strictly restricted to admin-only pages
  if (user?.role === "admin" && (!roles || !roles.includes("admin"))) {
    return <Navigate to="/admin" replace />;
  }
  // Researchers on normal phones (< 768px) cannot access desktop researcher workspace, redirected to home in community mode
  if (user?.role === "researcher" && roles?.includes("researcher") && isPhoneScreen()) {
    return <Navigate to="/" replace />;
  }
  return children;
}
