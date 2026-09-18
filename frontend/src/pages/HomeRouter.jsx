import { useAuth } from "../auth/AuthContext";
import { useIsPhone } from "../hooks/useIsPhone";
import CommunityHomePage from "./CommunityHomePage";
import ResearcherDashboardPage from "./ResearcherDashboardPage";
import AdminDashboardPage from "./AdminDashboardPage";

/** Renders the right home screen for the logged-in user's role and device screen size. */
export default function HomeRouter() {
  const { user } = useAuth();
  const isPhone = useIsPhone();

  if (user?.role === "admin") return <AdminDashboardPage />;
  if (user?.role === "researcher") {
    // On phones (< 768px, not including tablets/iPads), researchers see community member view
    if (isPhone) {
      return <CommunityHomePage />;
    }
    return <ResearcherDashboardPage />;
  }
  return <CommunityHomePage />;
}
