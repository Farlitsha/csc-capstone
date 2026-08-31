import { NavLink } from "react-router-dom";
import { useLanguage } from "../i18n/LanguageContext";
import LanguageSwitcher from "../components/LanguageSwitcher";
import "./MobileLayout.css";

export default function MobileLayout({ title, children, hideNav = false, onBack }) {
  const { t } = useLanguage();

  const NAV_ITEMS = [
    { to: "/", label: t("nav.home") },
    { to: "/services", label: t("nav.services") },
    { to: "/studies", label: t("nav.studies") },
    { to: "/workshops", label: t("nav.workshops") || "Workshops" },
    { to: "/profile", label: t("nav.profile") },
  ];

  return (
    <div className="ch-mobile">
      <header className="ch-mobile__topbar">
        {onBack ? (
          <button className="ch-mobile__back" onClick={onBack} aria-label="Back">
            ←
          </button>
        ) : (
          <span className="ch-mobile__brand">{title || "CommHub"}</span>
        )}
        {onBack && <span className="ch-mobile__title">{title}</span>}
        <div className="ch-mobile__topbar-spacer" />
        <LanguageSwitcher />
      </header>

      <main className="ch-mobile__body">{children}</main>

      {!hideNav && (
        <nav className="ch-mobile__nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `ch-mobile__navitem${isActive ? " ch-mobile__navitem--active" : ""}`}
            >
              <span className="ch-mobile__navdot" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  );
}
