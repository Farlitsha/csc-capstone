import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
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
  const { token, user, login } = useAuth();
  const { t } = useLanguage();
  const [form, setForm] = useState({
    display_name: "",
    username: "",
    email: "",
    phone: "",
    password: "",
    role: "community_member",
  });
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (token) {
    return <Navigate to={user?.role === "admin" ? "/admin" : "/"} replace />;
  }

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

    if (!agreeTerms) {
      setError("Please agree to the Terms & Conditions to create an account.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        display_name: form.display_name.trim(),
        password: form.password,
        role: form.role,
        username: form.username.trim() || undefined,
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
      };

      const userCreated = await api.createAccount(payload);
      const loginIdentifier = userCreated?.username || form.display_name.trim();
      const result = await login(loginIdentifier, form.password);
      if (result.ok) {
        navigate("/", { replace: true });
      } else {
        setError(result.error || "Account created, but could not sign in automatically. Please log in.");
      }
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? (typeof err.detail === "string"
              ? err.detail
              : (Array.isArray(err.detail)
                  ? err.detail.map((d) => d.msg).join(", ")
                  : (err.message || "Could not create account")))
          : (err.message || "Could not create account");
      setError(msg);
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
          <Field
            label={t("signup.email")}
            id="email"
            type="email"
            placeholder={t("signup.emailPlaceholder") || "Optional, but helps connect you to other users"}
            value={form.email}
            onChange={update("email")}
          />
          <Field
            label={t("signup.phone")}
            id="phone"
            type="tel"
            placeholder={t("signup.phonePlaceholder") || "Optional, but helps connect you to other users"}
            value={form.phone}
            onChange={update("phone")}
          />
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

          {/* Terms & Conditions Agreement */}
          <label className="ch-terms-agreement">
            <input
              type="checkbox"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              required
            />
            <span>
              I agree to the{" "}
              <a
                href="/terms"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--color-teal-700, #0f766e)", fontWeight: 600, textDecoration: "underline" }}
              >
                Terms & Conditions
              </a>
              .
            </span>
          </label>

          {error && (
            <p className="ch-login__error" role="alert" aria-live="assertive">
              {error}
            </p>
          )}
          <Button type="submit" fullWidth disabled={submitting || !agreeTerms}>
            {submitting ? t("signup.creating") : t("signup.button")}
          </Button>
        </form>
        <div className="ch-login__signup">
          <span>{t("signup.haveAccount")}</span>
          <a href="/login">{t("signup.loginLink")}</a>
        </div>

        <div style={{ marginTop: "16px", paddingTop: "12px", borderTop: "1px solid var(--color-line, #e2e8f0)", textAlign: "center", fontSize: "11.5px", color: "var(--color-sage, #64748b)" }}>
          <a href="/terms" style={{ color: "inherit", textDecoration: "underline" }}>Terms & Conditions</a>
        </div>
      </div>
    </div>
  );
}
