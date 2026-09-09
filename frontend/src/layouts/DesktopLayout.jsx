import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useLanguage } from "../i18n/LanguageContext";
import Button from "../components/Button";
import LanguageSwitcher from "../components/LanguageSwitcher";
import "./DesktopLayout.css";

/**
 * eyebrow: small workspace label under the CommHub wordmark, e.g. "RESEARCHER WORKSPACE"
 * rightSlot: optional extra controls before the account avatar (e.g. "New study" button)
 */
export default function DesktopLayout({ eyebrow, rightSlot, children }) {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const initials = (user?.username || "?").slice(0, 2).toUpperCase();

  return (
    <div className="ch-desktop">
      {/* ── Accessible Skip Navigation Link ── */}
      <a href="#main-content" className="ch-skip-link">
        Skip to main content
      </a>

      <header className="ch-desktop__topbar">
        <div className="ch-desktop__brand">
          <span className="ch-desktop__wordmark">CommHub</span>
          {eyebrow && <span className="ch-desktop__eyebrow">{eyebrow}</span>}
        </div>
        <div className="ch-desktop__right">
          {rightSlot}
          <LanguageSwitcher />
          <Link to="/profile" className="ch-desktop__profile-link">
            {t("common.myProfile")}
          </Link>
          <Button variant="secondary" onClick={logout}>
            {t("common.logout")}
          </Button>
          <div className="ch-desktop__avatar" title={user?.username} aria-label={`${user?.username || "User"} profile avatar`}>
            {initials}
          </div>
        </div>
      </header>
      <main id="main-content" tabIndex="-1" className="ch-desktop__body">
        {children}
      </main>
    </div>
  );
}
