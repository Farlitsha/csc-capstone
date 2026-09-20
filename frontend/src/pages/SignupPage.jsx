import { useState, useRef } from "react";
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
  const mountTimeRef = useRef(Date.now());
  const [websiteHp, setWebsiteHp] = useState("");
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

    if (!form.username.trim()) {
      setError("Please enter a username.");
      return;
    }

    if (form.username.trim().length < 3) {
      setError("Username must be at least 3 characters long.");
      return;
    }

    if (!/^[a-zA-Z0-9_\.\-]+$/.test(form.username.trim())) {
      setError("Username may only contain letters, numbers, underscores, dashes, and periods.");
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

    // Bot prevention: honeypot & timing heuristic
    if (websiteHp) {
      setError("Unable to process signup. Please try again.");
      return;
    }
    const elapsed = Date.now() - mountTimeRef.current;
    if (elapsed < 1200) {
      setError("Please take a moment to review your details before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      const usernameClean = form.username.trim();
      const payload = {
        username: usernameClean,
        display_name: form.display_name?.trim() || usernameClean,
        password: form.password,
        role: form.role,
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        website_hp: websiteHp || undefined,
        submission_duration_ms: elapsed,
      };

      const userCreated = await api.createAccount(payload);
      const loginIdentifier = userCreated?.username || usernameClean;
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
          {/* Honeypot field for bot detection: hidden from real users, automated bots fill it */}
          <div style={{ position: "absolute", left: "-9999px", opacity: 0, height: 0, overflow: "hidden", pointerEvents: "none" }} aria-hidden="true">
            <label htmlFor="website_hp">Leave this field blank</label>
            <input
              type="text"
              id="website_hp"
              name="website_hp"
              tabIndex={-1}
              autoComplete="off"
              value={websiteHp}
              onChange={(e) => setWebsiteHp(e.target.value)}
            />
          </div>

          <Field
            label={t("signup.username") || "Username"}
            id="username"
            placeholder={t("signup.usernamePlaceholder") || "e.g. nomvula_k"}
            value={form.username}
            onChange={update("username")}
            autoComplete="username"
            required
          />
          <Field
            label={t("signup.fullName") || "Full Name (optional)"}
            id="display_name"
            placeholder="e.g. Nomvula Khumalo"
            value={form.display_name}
            onChange={update("display_name")}
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
