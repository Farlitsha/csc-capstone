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
    display_name: "",
    username: "",
    email: "",
    phone: "",
    password: "",
    role: "community_member",
  });
  const [popiaConsent, setPopiaConsent] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!form.display_name.trim()) {
      setError("Please enter your Full Name.");
      return;
    }

    if (!/^\d{5}$/.test(form.password)) {
      setError("PIN must be exactly 5 numeric digits (e.g. 12345).");
      return;
    }

    if (!popiaConsent) {
      setError("Please agree to the POPIA data privacy consent to create an account.");
      return;
    }

    setSubmitting(true);
    try {
      // Auto-derive username if not supplied
      const derivedUsername =
        form.username.trim() ||
        form.display_name.trim().toLowerCase().replace(/[^a-z0-9]/g, "") ||
        form.email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "");

      const payload = {
        ...form,
        username: derivedUsername,
        display_name: form.display_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
      };

      await api.createAccount(payload);
      const result = await login(payload.username, form.password);
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
          <Field
            label={t("signup.fullName") || "Full Name"}
            id="display_name"
            placeholder="e.g. Nomvula Khumalo"
            value={form.display_name}
            onChange={update("display_name")}
            required
          />
          <Field label={t("signup.email")} id="email" type="email" value={form.email} onChange={update("email")} required />
          <Field label={t("signup.phone")} id="phone" type="tel" placeholder="e.g. +27 82 123 4567" value={form.phone} onChange={update("phone")} />
          <Field
            label={t("signup.password") || "5-Digit PIN"}
            id="password"
            type="password"
            inputMode="numeric"
            pattern="[0-9]{5}"
            maxLength={5}
            placeholder="e.g. 12345"
            value={form.password}
            onChange={update("password")}
            required
          />
          
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

          {/* ── POPIA Data Privacy Notice ── */}
          <div className="ch-popia-box">
            <div className="ch-popia-box__header">
              <Icon name="info" size={15} />
              <span>{t("signup.popiaTitle") || "POPIA Data Privacy Notice"}</span>
            </div>
            <p className="ch-popia-box__text">
              {t("signup.popiaText") ||
                "In accordance with South Africa's Protection of Personal Information Act (POPIA), CommHub collects and processes your details solely to connect you with local community services, workshops, and verified research. Your personal data is strictly kept secure and will never be shared or sold to third parties. Participation in community census surveys and research studies is entirely voluntary — you are never forced to take census or surveys, and they are purely optional. You can update or delete your information at any time."}
            </p>
            <label className="ch-popia-box__label">
              <input
                type="checkbox"
                checked={popiaConsent}
                onChange={(e) => setPopiaConsent(e.target.checked)}
                required
              />
              <span>
                {t("signup.popiaConsent") ||
                  "I agree to the processing of my personal information in accordance with POPIA. I understand that participating in any census or survey is purely optional and voluntary."}
              </span>
            </label>
          </div>

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
