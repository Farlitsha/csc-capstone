import { useLanguage } from "../i18n/LanguageContext";
import { LANGUAGES } from "../i18n/translations";
import "./LanguageSwitcher.css";

const SHORT_CODE = { en: "EN", af: "AF", xh: "XH", zu: "ZU" };

const LANGUAGE_LABELS = {
  en: "English",
  af: "Afrikaans",
  xh: "isiXhosa",
  zu: "isiZulu",
};

export default function LanguageSwitcher({ className = "" }) {
  const { lang, setLang, t } = useLanguage();
  const currentCode = SHORT_CODE[lang] || lang.toUpperCase();

  return (
    <div className={`ch-lang-picker ${className}`} title={t("language.label") || "Change language"}>
      <div className="ch-lang-picker__badge" aria-hidden="true">
        <span className="ch-lang-picker__code">{currentCode}</span>
        <span className="ch-lang-picker__arrow">▾</span>
      </div>
      <select
        className="ch-lang-picker__select"
        value={lang}
        onChange={(e) => setLang(e.target.value)}
        aria-label={t("language.label") || "Change language"}
      >
        {LANGUAGES.map((code) => (
          <option key={code} value={code}>
            {SHORT_CODE[code]} - {LANGUAGE_LABELS[code] || code}
          </option>
        ))}
      </select>
    </div>
  );
}
