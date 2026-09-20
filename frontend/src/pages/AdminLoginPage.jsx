import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import Field from "../components/Field";
import Button from "../components/Button";
import LanguageSwitcher from "../components/LanguageSwitcher";
import "./AdminLoginPage.css";

export default function AdminLoginPage() {
  const { user, token, adminLogin } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // If already logged in as admin, redirect directly to /admin
  if (token && user?.role === "admin") {
    return <Navigate to="/admin" replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const result = await adminLogin(username, password);
    setSubmitting(false);
    if (result.ok) {
      navigate("/admin", { replace: true });
    } else {
      setError(result.error || "Authentication failed. Only platform administrators may log in here.");
    }
  }

  return (
    <div className="ch-admin-login">
      <div className="ch-admin-login__lang">
        <LanguageSwitcher />
      </div>

      <div className="ch-admin-login__card">
        <div className="ch-admin-login__header">
          <div className="ch-admin-login__badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span>Restricted Access</span>
          </div>
          <h1 className="ch-admin-login__heading">Admin Portal</h1>
          <p className="ch-admin-login__subheading">CommHub System Administration &amp; Moderation</p>
        </div>

        <div className="ch-admin-login__notice">
          <svg className="ch-admin-login__notice-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <div>
            This portal is strictly for platform administrators. Standard members and researchers should sign in via the regular login.
          </div>
        </div>

        <form className="ch-admin-login__form" onSubmit={handleSubmit}>
          <Field
            label="Admin Username or Email"
            id="admin-username"
            type="text"
            placeholder="e.g. chief_admin or admin@commhub.org"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />

          <Field
            label="Admin Security PIN / Password"
            id="admin-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && (
            <div className="ch-admin-login__error" role="alert" aria-live="assertive">
              {error}
            </div>
          )}

          <Button type="submit" fullWidth disabled={submitting}>
            {submitting ? "Authenticating Admin…" : "Sign In to Admin Console"}
          </Button>
        </form>

        <div className="ch-admin-login__footer">
          <a href="/login" className="ch-admin-login__back">
            ← Return to Member Login
          </a>
        </div>
      </div>
    </div>
  );
}

