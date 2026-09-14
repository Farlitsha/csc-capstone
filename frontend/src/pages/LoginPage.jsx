import { useState } from "react";
import { useNavigate, useLocation, Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useLanguage } from "../i18n/LanguageContext";
import Button from "../components/Button";
import Field from "../components/Field";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { api, ApiError } from "../lib/api";
import "./LoginPage.css";

export default function LoginPage() {
  const { token, login, refreshUser } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reactivating, setReactivating] = useState(false);

  if (token) {
    return <Navigate to={location.state?.from ?? "/"} replace />;
  }

  async function handleReactivate() {
    setReactivating(true);
    setError("");
    try {
      const res = await api.reactivateAccount(username, password);
      if (res?.access_token) {
        localStorage.setItem("commhub_token", res.access_token);
        if (refreshUser) await refreshUser();
        navigate(location.state?.from ?? "/", { replace: true });
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Could not reactivate account.");
    } finally {
      setReactivating(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const result = await login(username, password);
    setSubmitting(false);
    if (result.ok) {
      navigate(location.state?.from ?? "/", { replace: true });
    } else {
      setError(result.error || "Invalid username or password");
    }
  }

  return (
    <div className="ch-login">
      <div className="ch-login__lang">
        <LanguageSwitcher />
      </div>
      <div className="ch-login__card">
        <h1 className="ch-login__heading">{t("login.heading")}</h1>

        {location.state?.flashMessage && (
          <div
            style={{
              background: "#dcfce7",
              color: "#15803d",
              border: "1px solid #86efac",
              padding: "10px 14px",
              borderRadius: "8px",
              fontSize: "13px",
              marginBottom: "16px",
              textAlign: "center",
              lineHeight: "1.4",
            }}
            role="status"
            aria-live="polite"
          >
            {location.state.flashMessage}
          </div>
        )}

        <form className="ch-login__form" onSubmit={handleSubmit}>
          <Field
            label={t("login.fullName") || "Full Name"}
            id="username"
            type="text"
            placeholder="e.g. Nomvula Khumalo"
            autoComplete="name"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <Field
            label={t("login.password") || "5-Digit PIN"}
            id="password"
            type="password"
            inputMode="numeric"
            pattern="[0-9]{5}"
            maxLength={5}
            placeholder="•••••"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && (
            <div style={{ marginBottom: "12px" }}>
              <p className="ch-login__error" role="alert" aria-live="assertive">
                {error}
              </p>
              {error.toLowerCase().includes("deactivated") && (
                <Button
                  variant="secondary"
                  fullWidth
                  style={{ marginTop: "8px" }}
                  disabled={reactivating}
                  onClick={handleReactivate}
                >
                  {reactivating ? "Reactivating…" : "Reactivate Account & Sign In"}
                </Button>
              )}
            </div>
          )}

          <Button type="submit" fullWidth disabled={submitting || reactivating}>
            {submitting ? t("login.signingIn") : t("login.button")}
          </Button>
        </form>

        <div className="ch-login__signup">
          <span>{t("login.signupPrompt")}</span>
          <a href="/signup">{t("login.signupLink")}</a>
        </div>

        <div className="ch-login__divider">
          <span>or</span>
        </div>

        <a href="/" className="ch-login__guest">
          {t("login.browseGuest")}
        </a>

        <div style={{ marginTop: "14px", textAlign: "center" }}>
          <a href="/admin/login" style={{ color: "var(--color-ink, #1e293b)", fontWeight: 600, fontSize: "12px", textDecoration: "none" }}>
            {t("login.adminPortalLink") || "Administrator? Sign in to Admin Portal →"}
          </a>
        </div>

        <div style={{ marginTop: "16px", paddingTop: "12px", borderTop: "1px solid var(--color-line, #e2e8f0)", textAlign: "center", fontSize: "11.5px", color: "var(--color-sage, #64748b)", display: "flex", justifyContent: "center", gap: "12px" }}>
          <a href="/terms" style={{ color: "inherit", textDecoration: "underline" }}>Terms & Conditions</a>
          <span>•</span>
          <a href="/privacy" style={{ color: "inherit", textDecoration: "underline" }}>Privacy Policy</a>
        </div>
      </div>
    </div>
  );
}
