import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { LanguageProvider } from "./i18n/LanguageContext";
import ProtectedRoute from "./auth/ProtectedRoute";

import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import HomeRouter from "./pages/HomeRouter";
import ServicesDirectoryPage from "./pages/ServicesDirectoryPage";
import StudiesDirectoryPage from "./pages/StudiesDirectoryPage";
import WorkshopsDirectoryPage from "./pages/WorkshopsDirectoryPage";
import PostServicePage from "./pages/PostServicePage";
import AnnouncementsPage from "./pages/AnnouncementsPage";
import ProfilePage from "./pages/ProfilePage";
import CommunityStatsPage from "./pages/CommunityStatsPage";
import CommunityCensusPage from "./pages/CommunityCensusPage";
import ResearcherDashboardPage from "./pages/ResearcherDashboardPage";
import BuildSurveyPage from "./pages/BuildSurveyPage";
import TakeSurveyPage from "./pages/TakeSurveyPage";
import SurveyResponsesPage from "./pages/SurveyResponsesPage";
import StudyApplicantsPage from "./pages/StudyApplicantsPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";

export default function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <AuthProvider>
          <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          {/* Public / Guest-browsable routes */}
          <Route path="/" element={<HomeRouter />} />
          <Route path="/services" element={<ServicesDirectoryPage />} />
          <Route path="/studies" element={<StudiesDirectoryPage />} />
          <Route path="/workshops" element={<WorkshopsDirectoryPage />} />
          <Route path="/announcements" element={<AnnouncementsPage />} />
          <Route path="/community-stats" element={<CommunityStatsPage />} />

          {/* Account-required routes (apply/request/census/profile) */}
          <Route path="/services/new" element={<ProtectedRoute><PostServicePage /></ProtectedRoute>} />
          <Route path="/community-census" element={<ProtectedRoute><CommunityCensusPage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />


          <Route
            path="/researcher"
            element={
              <ProtectedRoute roles={["researcher"]}>
                <ResearcherDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/researcher/studies/new"
            element={
              <ProtectedRoute roles={["researcher"]}>
                <BuildSurveyPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/studies/:studyId/survey"
            element={<ProtectedRoute><TakeSurveyPage /></ProtectedRoute>}
          />
          <Route
            path="/researcher/studies/:studyId/applicants"
            element={
              <ProtectedRoute roles={["researcher", "admin"]}>
                <StudyApplicantsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/researcher/studies/:studyId/responses"
            element={
              <ProtectedRoute roles={["researcher", "admin"]}>
                <SurveyResponsesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={["admin"]}>
                <AdminDashboardPage />
              </ProtectedRoute>
            }
          />
        </Routes>
        </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
}
