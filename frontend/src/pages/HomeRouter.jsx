import { useAuth } from "../auth/AuthContext";
import CommunityHomePage from "./CommunityHomePage";
import ResearcherDashboardPage from "./ResearcherDashboardPage";
import AdminDashboardPage from "./AdminDashboardPage";

/** Renders the right home screen for the logged-in user's role. */
export default function HomeRouter() {
  const { user } = useAuth();

  if (user?.role === "researcher") return <ResearcherDashboardPage />;
  if (user?.role === "admin") return <AdminDashboardPage />;
  return <CommunityHomePage />;
}
