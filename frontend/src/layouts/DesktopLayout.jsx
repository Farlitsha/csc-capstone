import { Link, NavLink } from "react-router-dom";
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

  const NAV_ITEMS = [
    { to: "/", label: "Home" },
    { to: "/services", label: "Services" },
    { to: "/studies", label: "Studies" },
    { to: "/workshops", label: "Workshops" },
    { to: "/tutorials", label: "Tutorials" },
    ];


  return (
    <div className="ch-desktop">
      {/* Accessible Skip Navigation Link */}
      <a href="#main-content" className="ch-skip-link">
        {t("common.skipLink")}
      </a>

      <header className="ch-desktop__topbar">
        <div className="ch-desktop__brand">
          <span className="ch-desktop__wordmark">CommHub</span>
          {eyebrow && <span className="ch-desktop__eyebrow">{eyebrow}</span>}
        </div>

      {/* Desktop Navigation */}
      <nav className="ch-desktop__nav">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              isActive
                ? "ch-desktop__nav-link ch-desktop__nav-link--active"
                : "ch-desktop__nav-link"
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

        <div className="ch-desktop__right">
          {rightSlot}
          <LanguageSwitcher />
          {user ? (
            <>
              <Link to="/profile" className="ch-desktop__profile-link">
                {t("common.myProfile")}
              </Link>
              <Button variant="secondary" onClick={logout}>
                {t("common.logout")}
              </Button>
              <div className="ch-desktop__avatar" title={user?.username} aria-label={`${user?.username || "User"} profile avatar`}>
                {initials}
              </div>
            </>
          ) : (
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <Link to="/login">
                <Button variant="secondary">{t("login.button") || "Log in"}</Button>
              </Link>
              <Link to="/signup">
                <Button variant="accent">{t("login.signupLink") || "Create account"}</Button>
              </Link>
            </div>
          )}
        </div>
      </header>
      <main id="main-content" tabIndex="-1" className="ch-desktop__body">
        {children}
      </main>
    </div>
  );
}
