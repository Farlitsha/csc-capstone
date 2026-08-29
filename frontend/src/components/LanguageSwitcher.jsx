import { useLanguage } from "../i18n/LanguageContext";
import { LANGUAGES } from "../i18n/translations";
import "./LanguageSwitcher.css";

const FLAG = { en: "🇬🇧", af: "🇿🇦", xh: "🇿🇦", zu: "🇿🇦" };

export default function LanguageSwitcher({ className = "" }) {
  const { lang, setLang, t } = useLanguage();

  return (
    <select
      className={`ch-lang-switcher ${className}`}
      value={lang}
      onChange={(e) => setLang(e.target.value)}
      aria-label={t("language.label")}
    >
      {LANGUAGES.map((code) => (
        <option key={code} value={code}>
          {FLAG[code]} {t(`language.${{ en: "english", af: "afrikaans", xh: "xhosa", zu: "zulu" }[code]}`)}
        </option>
      ))}
    </select>
  );
}
