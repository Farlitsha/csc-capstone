import { NavLink } from "react-router-dom";
import { useLanguage } from "../i18n/LanguageContext";
import LanguageSwitcher from "../components/LanguageSwitcher";
import Icon from "../components/Icon";
import "./MobileLayout.css";

export default function MobileLayout({ title, children, hideNav = false, onBack }) {
  const { t } = useLanguage();

  const NAV_ITEMS = [
    { to: "/", label: t("nav.home"), icon: "home" },
    { to: "/services", label: t("nav.services"), icon: "briefcase" },
    { to: "/studies", label: t("nav.studies"), icon: "clipboard" },
    { to: "/workshops", label: t("nav.workshops") || "Workshops", icon: "calendar" },
    { to: "/profile", label: t("nav.profile"), icon: "user" },
  ];

  return (
    <div className="ch-mobile">
      {/* ── Accessible Skip Navigation Link ── */}
      <a href="#main-content" className="ch-skip-link">
        Skip to main content
      </a>

      <header className="ch-mobile__topbar">
        {onBack ? (
          <button className="ch-mobile__back" onClick={onBack} aria-label="Go back">
            ←
          </button>
        ) : (
          <span className="ch-mobile__brand">{title || "CommHub"}</span>
        )}
        {onBack && <span className="ch-mobile__title">{title}</span>}
        <div className="ch-mobile__topbar-spacer" />
        <LanguageSwitcher />
      </header>

      <main id="main-content" tabIndex="-1" className="ch-mobile__body">
        {children}
      </main>

      {!hideNav && (
        <nav className="ch-mobile__nav" aria-label="Main Navigation">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              aria-current={({ isActive }) => (isActive ? "page" : undefined)}
              className={({ isActive }) => `ch-mobile__navitem${isActive ? " ch-mobile__navitem--active" : ""}`}
            >
              <Icon name={item.icon} size={20} className="ch-mobile__navicon" aria-hidden="true" />
              <span className="ch-mobile__navlabel">{item.label}</span>
              <span className="ch-mobile__active-indicator" aria-hidden="true" />
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  );
}
