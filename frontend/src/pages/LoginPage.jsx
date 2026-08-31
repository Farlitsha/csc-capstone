import { useState } from "react";
import { useNavigate, useLocation, Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useLanguage } from "../i18n/LanguageContext";
import Button from "../components/Button";
import Field from "../components/Field";
import LanguageSwitcher from "../components/LanguageSwitcher";
import "./LoginPage.css";

export default function LoginPage() {
  const { token, login } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (token) {
    return <Navigate to={location.state?.from ?? "/"} replace />;
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

          {error && <p className="ch-login__error">{error}</p>}

          <Button type="submit" fullWidth disabled={submitting}>
            {submitting ? t("login.signingIn") : t("login.button")}
          </Button>
        </form>

        <div className="ch-login__signup">
          <span>{t("login.signupPrompt")}</span>
          <a href="/signup">{t("login.signupLink")}</a>
        </div>
      </div>
    </div>
  );
}
