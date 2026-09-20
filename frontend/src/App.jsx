import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { LanguageProvider } from "./i18n/LanguageContext";
import { SettingsProvider } from "./context/SettingsContext";
import ProtectedRoute from "./auth/ProtectedRoute";
import NonAdminRoute from "./auth/NonAdminRoute";

import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import HomeRouter from "./pages/HomeRouter";
import ServicesDirectoryPage from "./pages/ServicesDirectoryPage";
import StudiesDirectoryPage from "./pages/StudiesDirectoryPage";
import WorkshopsDirectoryPage from "./pages/WorkshopsDirectoryPage";
import PostServicePage from "./pages/PostServicePage";
import AnnouncementsPage from "./pages/AnnouncementsPage";
import ProfilePage from "./pages/ProfilePage";
import SettingsPage from "./pages/SettingsPage";
import CommunityStatsPage from "./pages/CommunityStatsPage";
import CommunityCensusPage from "./pages/CommunityCensusPage";
import ResearcherDashboardPage from "./pages/ResearcherDashboardPage";
import BuildSurveyPage from "./pages/BuildSurveyPage";
import TakeSurveyPage from "./pages/TakeSurveyPage";
import SurveyResponsesPage from "./pages/SurveyResponsesPage";
import StudyApplicantsPage from "./pages/StudyApplicantsPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import AdminLoginPage from "./pages/AdminLoginPage";
import TermsPage from "./pages/TermsPage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import TutorialsPage from "./pages/TutorialsPage";

export default function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <AuthProvider>
          <SettingsProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/admin/login" element={<AdminLoginPage />} />
              <Route path="/admin-login" element={<AdminLoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/terms" element={<NonAdminRoute><TermsPage /></NonAdminRoute>} />
              <Route path="/privacy" element={<NonAdminRoute><PrivacyPolicyPage /></NonAdminRoute>} />
              <Route path="/tutorials" element={<NonAdminRoute><TutorialsPage /></NonAdminRoute>} />
              <Route path="/settings" element={<NonAdminRoute><SettingsPage /></NonAdminRoute>} />

            {/* Root Route: renders AdminDashboardPage for admin, Researcher for researcher, Community for member/guest */}
            <Route path="/" element={<HomeRouter />} />

            {/* Public / Guest-browsable routes (non-admin only) */}
            <Route path="/services" element={<NonAdminRoute><ServicesDirectoryPage /></NonAdminRoute>} />
            <Route path="/studies" element={<NonAdminRoute><StudiesDirectoryPage /></NonAdminRoute>} />
            <Route path="/workshops" element={<NonAdminRoute><WorkshopsDirectoryPage /></NonAdminRoute>} />
            <Route path="/announcements" element={<NonAdminRoute><AnnouncementsPage /></NonAdminRoute>} />
            <Route path="/community-stats" element={<NonAdminRoute><CommunityStatsPage /></NonAdminRoute>} />

            {/* Account-required routes (apply/request/census/profile) */}
            <Route path="/services/new" element={<ProtectedRoute><PostServicePage /></ProtectedRoute>} />
            <Route path="/community-census" element={<ProtectedRoute><CommunityCensusPage /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

            {/* Researcher routes */}
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
              path="/researcher/studies/:studyId/edit"
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
                <ProtectedRoute roles={["researcher"]}>
                  <StudyApplicantsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/researcher/studies/:studyId/responses"
              element={
                <ProtectedRoute roles={["researcher"]}>
                  <SurveyResponsesPage />
                </ProtectedRoute>
              }
            />

            {/* Admin-only route */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute roles={["admin"]}>
                  <AdminDashboardPage />
                </ProtectedRoute>
              }
            />
          </Routes>
          </SettingsProvider>
        </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
}
