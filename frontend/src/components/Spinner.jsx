import { useLanguage } from "../i18n/LanguageContext";
import "./Spinner.css";

/**
 * Accessible Loading Spinner & Status feedback component.
 * Uses role="status" and aria-live="polite" to inform assistive technology.
 */
export default function Spinner({ label, size = "md", inline = false, className = "" }) {
  const { t } = useLanguage();
  const displayLabel = label || t("common.loading") || "Loading…";

  return (
    <div
      className={`ch-loading-status ch-loading-status--${size} ${inline ? "ch-loading-status--inline" : ""} ${className}`}
      role="status"
      aria-live="polite"
    >
      <span className="ch-spinner" aria-hidden="true" />
      <span className={inline ? "ch-loading-text" : "ch-loading-text"}>{displayLabel}</span>
    </div>
  );
}

