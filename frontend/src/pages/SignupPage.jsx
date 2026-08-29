import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Field from "../components/Field";
import Button from "../components/Button";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { api, ApiError } from "../lib/api";
import { useAuth } from "../auth/AuthContext";
import { useLanguage } from "../i18n/LanguageContext";
import "./LoginPage.css";

export default function SignupPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { t } = useLanguage();
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await api.createAccount(form);
      const result = await login(form.username, form.password);
      if (result.ok) navigate("/", { replace: true });
      else setError(result.error);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Could not create account");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="ch-login">
      <div className="ch-login__lang">
        <LanguageSwitcher />
      </div>
      <div className="ch-login__card">
        <h1 className="ch-login__heading">{t("signup.heading")}</h1>
        <form className="ch-login__form" onSubmit={handleSubmit}>
          <Field label={t("signup.username")} id="username" value={form.username} onChange={update("username")} required />
          <Field label={t("signup.email")} id="email" type="email" value={form.email} onChange={update("email")} required />
          <Field label={t("signup.password")} id="password" type="password" value={form.password} onChange={update("password")} required />
          {error && <p className="ch-login__error">{error}</p>}
          <Button type="submit" fullWidth disabled={submitting}>
            {submitting ? t("signup.creating") : t("signup.button")}
          </Button>
        </form>
        <div className="ch-login__signup">
          <span>{t("signup.haveAccount")}</span>
          <a href="/login">{t("signup.loginLink")}</a>
        </div>
      </div>
    </div>
  );
}
