import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { LanguageProvider } from "./i18n/LanguageContext";
import ProtectedRoute from "./auth/ProtectedRoute";

import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import HomeRouter from "./pages/HomeRouter";
import ServicesDirectoryPage from "./pages/ServicesDirectoryPage";
import StudiesDirectoryPage from "./pages/StudiesDirectoryPage";
import PostServicePage from "./pages/PostServicePage";
import MessagesPage from "./pages/MessagesPage";
import ProfilePage from "./pages/ProfilePage";
import ResearcherDashboardPage from "./pages/ResearcherDashboardPage";
import BuildSurveyPage from "./pages/BuildSurveyPage";
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

          <Route path="/" element={<ProtectedRoute><HomeRouter /></ProtectedRoute>} />
          <Route path="/services" element={<ProtectedRoute><ServicesDirectoryPage /></ProtectedRoute>} />
          <Route path="/services/new" element={<ProtectedRoute><PostServicePage /></ProtectedRoute>} />
          <Route path="/studies" element={<ProtectedRoute><StudiesDirectoryPage /></ProtectedRoute>} />
          <Route path="/messages" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
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
            path="/researcher/studies/:studyId/applicants"
            element={
              <ProtectedRoute roles={["researcher", "admin"]}>
                <StudyApplicantsPage />
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
