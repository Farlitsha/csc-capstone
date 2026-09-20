import { useState } from "react";
import { useNavigate } from "react-router-dom";
import MobileLayout from "../layouts/MobileLayout";
import Card from "../components/Card";
import Button from "../components/Button";
import Field from "../components/Field";
import Icon from "../components/Icon";
import { useSettings } from "../context/SettingsContext";
import { useAuth } from "../auth/AuthContext";
import { useLanguage } from "../i18n/LanguageContext";
import { api, ApiError } from "../lib/api";
import "./SettingsPage.css";

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const {
    dataSaver,
    setDataSaver,
    fontSize,
    setFontSize,
    theme,
    setTheme,
    reduceMotion,
    setReduceMotion,
    storageUsedKb,
    clearOfflineCache,
  } = useSettings();

  // PIN change state
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinLoading, setPinLoading] = useState(false);
  const [pinError, setPinError] = useState("");
  const [pinSuccess, setPinSuccess] = useState("");

  // Cache clear feedback state
  const [cacheNotice, setCacheNotice] = useState("");

  async function handlePinChange(e) {
    e.preventDefault();
    setPinError("");
    setPinSuccess("");

    if (!/^\d{5}$/.test(currentPin)) {
      setPinError("Current PIN must be exactly 5 numeric digits.");
      return;
    }
    if (!/^\d{5}$/.test(newPin)) {
      setPinError("New PIN must be exactly 5 numeric digits.");
      return;
    }
    if (newPin !== confirmPin) {
      setPinError("New PIN and Confirm PIN do not match.");
      return;
    }
    if (newPin === currentPin) {
      setPinError("New PIN must be different from your current PIN.");
      return;
    }

    setPinLoading(true);
    try {
      await api.changePin({
        current_pin: currentPin,
        new_pin: newPin,
      });
      setPinSuccess("Your 5-digit PIN has been updated successfully!");
      setCurrentPin("");
      setNewPin("");
      setConfirmPin("");
    } catch (err) {
      const msg = err instanceof ApiError ? err.detail : "Could not update PIN. Please verify current PIN.";
      setPinError(msg);
    } finally {
      setPinLoading(false);
    }
  }

  function handleClearCache() {
    clearOfflineCache();
    setCacheNotice(t("settings.cacheCleared") || "Saved phone space freed up! The app is fresh and ready.");
    setTimeout(() => setCacheNotice(""), 3500);
  }

  return (
    <MobileLayout title={t("settings.title") || "Settings"} onBack={() => navigate(-1)}>
      <div className="ch-settings">
        {/* 1. DATA & AIRTIME SAVER */}
        <Card>
          <div className="ch-settings__section-header">
            <Icon name="sliders" size={17} />
            <span>{t("settings.dataSection") || "Save Mobile Data & Airtime"}</span>
          </div>

          <div className="ch-settings__row">
            <div className="ch-settings__info">
              <h4 className="ch-settings__title">{t("settings.dataSaver") || "Save My Mobile Data (Recommended)"}</h4>
              <p className="ch-settings__desc">
                {t("settings.dataSaverDesc") ||
                  "Keeps photos hidden until tapped. Saves up to 90% of your mobile airtime/data bundle. Turn off only when connected to Wi-Fi."}
              </p>
            </div>
            <label className="ch-switch" aria-label="Toggle Data Saver Mode">
              <input
                type="checkbox"
                checked={dataSaver}
                onChange={(e) => setDataSaver(e.target.checked)}
              />
              <span className="ch-switch__slider" />
            </label>
          </div>

          <div className="ch-settings__row" style={{ marginTop: "12px", borderTop: "1px solid var(--color-sand)", paddingTop: "12px" }}>
            <div className="ch-settings__info">
              <h4 className="ch-settings__title">{t("settings.cachedData") || "Saved Phone Memory"}</h4>
              <p className="ch-settings__desc">
                {storageUsedKb > 0
                  ? `Using ~${storageUsedKb} KB for offline caching and fast page loads.`
                  : "Minimal storage used."}
              </p>
            </div>
            <Button variant="secondary" onClick={handleClearCache}>
              {t("settings.clearCache") || "Free Up Space"}
            </Button>
          </div>

          {cacheNotice && (
            <div className="ch-settings__feedback ch-settings__feedback--success" style={{ marginTop: "12px" }}>
              {cacheNotice}
            </div>
          )}
        </Card>

        {/* 2. DISPLAY & ACCESSIBILITY */}
        <Card>
          <div className="ch-settings__section-header">
            <Icon name="search" size={17} />
            <span>{t("settings.displaySection") || "Reading & Screen Comfort"}</span>
          </div>

          {/* Font Scaling */}
          <div style={{ marginBottom: "16px" }}>
            <h4 className="ch-settings__title">{t("settings.fontSize") || "Text Size"}</h4>
            <p className="ch-settings__desc">
              {t("settings.fontSizeDesc") || "Make words larger so they are comfortable and easy to read."}
            </p>
            <div className="ch-settings__options">
              <button
                type="button"
                className={`ch-settings__opt-btn${fontSize === "normal" ? " ch-settings__opt-btn--active" : ""}`}
                onClick={() => setFontSize("normal")}
              >
                {t("settings.fontRegular") || "Regular"} (16px)
              </button>
              <button
                type="button"
                className={`ch-settings__opt-btn${fontSize === "large" ? " ch-settings__opt-btn--active" : ""}`}
                onClick={() => setFontSize("large")}
              >
                {t("settings.fontLarge") || "Bigger"} (18px)
              </button>
              <button
                type="button"
                className={`ch-settings__opt-btn${fontSize === "xlarge" ? " ch-settings__opt-btn--active" : ""}`}
                onClick={() => setFontSize("xlarge")}
              >
                {t("settings.fontXLarge") || "Largest"} (20px)
              </button>
            </div>
          </div>

          {/* Theme & Contrast */}
          <div style={{ marginBottom: "16px", borderTop: "1px solid var(--color-sand)", paddingTop: "12px" }}>
            <h4 className="ch-settings__title">{t("settings.theme") || "Screen Lighting"}</h4>
            <p className="ch-settings__desc">
              {t("settings.themeDesc") ||
                "Pick what feels easiest on your eyes or saves phone battery."}
            </p>
            <div className="ch-settings__options">
              <button
                type="button"
                className={`ch-settings__opt-btn${theme === "default" ? " ch-settings__opt-btn--active" : ""}`}
                onClick={() => setTheme("default")}
              >
                {t("settings.themeDefault") || "Warm Paper"}
              </button>
              <button
                type="button"
                className={`ch-settings__opt-btn${theme === "high-contrast" ? " ch-settings__opt-btn--active" : ""}`}
                onClick={() => setTheme("high-contrast")}
              >
                {t("settings.themeSunlight") || "Bright Sunlight"}
              </button>
              <button
                type="button"
                className={`ch-settings__opt-btn${theme === "dark" ? " ch-settings__opt-btn--active" : ""}`}
                onClick={() => setTheme("dark")}
              >
                {t("settings.themeDark") || "Night / Battery Saver"}
              </button>
            </div>
          </div>

          {/* Reduced Motion */}
          <div className="ch-settings__row" style={{ borderTop: "1px solid var(--color-sand)", paddingTop: "12px" }}>
            <div className="ch-settings__info">
              <h4 className="ch-settings__title">{t("settings.reduceMotion") || "Simple Animations"}</h4>
              <p className="ch-settings__desc">
                {t("settings.reduceMotionDesc") ||
                  "Turn off moving effects if your phone runs hot or feels slow."}
              </p>
            </div>
            <label className="ch-switch" aria-label="Toggle Reduced Motion">
              <input
                type="checkbox"
                checked={reduceMotion}
                onChange={(e) => setReduceMotion(e.target.checked)}
              />
              <span className="ch-switch__slider" />
            </label>
          </div>
        </Card>

        {/* 3. LANGUAGE PREFERENCES */}
        <Card>
          <div className="ch-settings__section-header">
            <Icon name="clipboard" size={17} />
            <span>{t("settings.languageSection") || "Language Preference"}</span>
          </div>
          <p className="ch-settings__desc" style={{ marginBottom: "12px" }}>
            {t("settings.languageDesc") ||
              "Choose the language you feel most at home with."}
          </p>
          <div className="ch-settings__options">
            <button
              type="button"
              className={`ch-settings__opt-btn${lang === "en" ? " ch-settings__opt-btn--active" : ""}`}
              onClick={() => setLang("en")}
            >
              English
            </button>
            <button
              type="button"
              className={`ch-settings__opt-btn${lang === "xh" ? " ch-settings__opt-btn--active" : ""}`}
              onClick={() => setLang("xh")}
            >
              isiXhosa
            </button>
            <button
              type="button"
              className={`ch-settings__opt-btn${lang === "af" ? " ch-settings__opt-btn--active" : ""}`}
              onClick={() => setLang("af")}
            >
              Afrikaans
            </button>
          </div>
        </Card>

        {/* 4. ACCOUNT SECURITY: CHANGE PIN (Logged-in members) */}
        {user ? (
          <Card>
            <div className="ch-settings__section-header">
              <Icon name="lock" size={17} />
              <span>{t("settings.securitySection") || "Account Security"}</span>
            </div>

            <form className="ch-settings__pin-form" onSubmit={handlePinChange}>
              <p className="ch-settings__desc">
                {t("settings.pinDesc") ||
                  "Update your 5-digit security PIN used to log in."}
              </p>

              <div className="ch-settings__pin-inputs">
                <Field
                  label={t("settings.currentPin") || "Current 5-Digit PIN"}
                  id="current_pin"
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]{5}"
                  maxLength={5}
                  autoComplete="current-password"
                  value={currentPin}
                  onChange={(e) => setCurrentPin(e.target.value)}
                  required
                />
                <Field
                  label={t("settings.newPin") || "New 5-Digit PIN"}
                  id="new_pin"
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]{5}"
                  maxLength={5}
                  autoComplete="new-password"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  required
                />
                <Field
                  label={t("settings.confirmPin") || "Confirm New PIN"}
                  id="confirm_pin"
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]{5}"
                  maxLength={5}
                  autoComplete="new-password"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value)}
                  required
                />
              </div>

              {pinError && (
                <div className="ch-settings__feedback ch-settings__feedback--error" role="alert">
                  {pinError}
                </div>
              )}
              {pinSuccess && (
                <div className="ch-settings__feedback ch-settings__feedback--success" role="status">
                  {pinSuccess}
                </div>
              )}

              <div>
                <Button type="submit" disabled={pinLoading}>
                  {pinLoading ? "Updating PIN…" : "Change PIN"}
                </Button>
              </div>
            </form>
          </Card>
        ) : (
          <Card>
            <div className="ch-settings__section-header">
              <Icon name="user" size={17} />
              <span>Account</span>
            </div>
            <p className="ch-settings__desc" style={{ marginBottom: "12px" }}>
              Sign in to manage your 5-digit PIN, contact preferences, and profile details.
            </p>
            <Button variant="secondary" onClick={() => navigate("/login")}>
              Log In to Your Account
            </Button>
          </Card>
        )}

        {/* 5. LEGAL & POPIA PRIVACY */}
        <Card>
          <div className="ch-settings__section-header">
            <Icon name="check" size={17} />
            <span>Legal & Privacy Rights</span>
          </div>
          <p className="ch-settings__desc" style={{ marginBottom: "12px" }}>
            CommHub protects your privacy under the Protection of Personal Information Act (POPIA).
          </p>
          <div style={{ display: "flex", gap: "16px", fontSize: "13px" }}>
            <a href="/terms" style={{ color: "var(--color-teal-700)", fontWeight: 700, textDecoration: "underline" }}>
              Terms of Service
            </a>
            <span style={{ color: "var(--color-line)" }}>•</span>
            <a href="/privacy" style={{ color: "var(--color-teal-700)", fontWeight: 700, textDecoration: "underline" }}>
              Privacy Policy (POPIA)
            </a>
          </div>
        </Card>
      </div>
    </MobileLayout>
  );
}

