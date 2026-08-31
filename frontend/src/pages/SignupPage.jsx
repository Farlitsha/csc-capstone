import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Field from "../components/Field";
import Button from "../components/Button";
import Icon from "../components/Icon";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { api, ApiError } from "../lib/api";
import { useAuth } from "../auth/AuthContext";
import { useLanguage } from "../i18n/LanguageContext";
import "./LoginPage.css";

export default function SignupPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { t } = useLanguage();
  const [form, setForm] = useState({
    username: "",
    display_name: "",
    email: "",
    password: "",
    role: "community_member",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
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
          <Field label="Display name (optional)" id="display_name" value={form.display_name} onChange={update("display_name")} />
          <Field label={t("signup.email")} id="email" type="email" value={form.email} onChange={update("email")} required />
          <Field label={t("signup.password")} id="password" type="password" value={form.password} onChange={update("password")} required />
          
          <div className="ch-field" style={{ marginBottom: "12px" }}>
            <label className="ch-field__label" htmlFor="role">I am joining as a:</label>
            <select
              id="role"
              className="ch-field__input"
              value={form.role}
              onChange={update("role")}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "8px",
                border: "1px solid var(--color-border, #ccc)",
                background: "var(--color-surface, #fff)",
                fontSize: "15px",
              }}
            >
              <option value="community_member">Community Member (Access services, workshops & surveys)</option>
              <option value="researcher">Researcher (Schedule workshops, post studies & surveys)</option>
            </select>
          </div>

          {form.role === "researcher" && (
            <p style={{ fontSize: "13px", color: "var(--color-warning-dark, #b45309)", background: "#fef3c7", padding: "8px 12px", borderRadius: "6px", margin: "0 0 14px 0", display: "flex", alignItems: "center", gap: "6px" }}>
              <Icon name="info" size={15} />
              <span>Researcher accounts are reviewed by an administrator before you can publish studies and schedule workshops.</span>
            </p>
          )}

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
