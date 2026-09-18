import { useState, useEffect } from "react";
import { NavLink, Link } from "react-router-dom";
import { useLanguage } from "../i18n/LanguageContext";
import { useAuth } from "../auth/AuthContext";
import LanguageSwitcher from "../components/LanguageSwitcher";
import Icon from "../components/Icon";
import "./MobileLayout.css";

// Offline Prompt Session State
// Shows once on initial launch without connection or on connection loss.
// Once dismissed with "Okay", it stays dismissed until connection is restored.
let hasDismissedOfflineSession = false;
let isOfflineModalActive = typeof navigator !== "undefined" && !navigator.onLine;
const offlineSubscribers = new Set();

function notifyOfflineSubscribers() {
  offlineSubscribers.forEach((callback) => callback(isOfflineModalActive));
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    hasDismissedOfflineSession = false;
    isOfflineModalActive = false;
    notifyOfflineSubscribers();
  });

  window.addEventListener("offline", () => {
    hasDismissedOfflineSession = false;
    isOfflineModalActive = true;
    notifyOfflineSubscribers();
  });
}

export default function MobileLayout({ title, children, hideNav = false, onBack }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [showOfflineModal, setShowOfflineModal] = useState(
    () => isOfflineModalActive && !hasDismissedOfflineSession
  );

  useEffect(() => {
    const handleStatusChange = (isActive) => {
      setShowOfflineModal(isActive && !hasDismissedOfflineSession);
    };
    offlineSubscribers.add(handleStatusChange);
    return () => {
      offlineSubscribers.delete(handleStatusChange);
    };
  }, []);

  const handleDismissOffline = () => {
    hasDismissedOfflineSession = true;
    isOfflineModalActive = false;
    setShowOfflineModal(false);
  };

  const NAV_ITEMS = [
    { to: "/", label: t("nav.home"), icon: "home" },
    { to: "/services", label: t("nav.services"), icon: "briefcase" },
    { to: "/studies", label: t("nav.studies"), icon: "clipboard" },
    { to: "/workshops", label: t("nav.workshops") || "Workshops", icon: "calendar" },
    { to: "/tutorials", label: t("tutorials.title") || "Tutorials", icon: "play" },
    user
      ? { to: "/profile", label: t("nav.profile"), icon: "user" }
      : { to: "/login", label: t("login.button") || "Log In", icon: "user" },
  ];

  return (
    <div className="ch-mobile">
      {/* Accessible Skip Navigation Link */}
      <a href="#main-content" className="ch-skip-link">
        {t("common.skipLink")}
      </a>

      <header className="ch-mobile__topbar">
        <div className="ch-mobile__topbar-inner">
          <div className="ch-mobile__topbar-left">
            {onBack ? (
              <button
                type="button"
                className="ch-mobile__back"
                onClick={onBack}
                aria-label={t("common.back")}
              >
                ←
              </button>
            ) : (
              <Link to="/" className="ch-mobile__brand">
                CommHub
              </Link>
            )}
            {title && <span className="ch-mobile__title">{title}</span>}
          </div>

          {/* Desktop & Tablet Navigation Bar in Header */}
          <nav className="ch-mobile__desktop-nav" aria-label="Desktop Navigation">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  `ch-mobile__desktop-navlink${isActive ? " ch-mobile__desktop-navlink--active" : ""}`
                }
              >
                <Icon name={item.icon} size={15} aria-hidden="true" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="ch-mobile__topbar-right">
            {!user ? (
              <Link to="/login" className="ch-mobile__guest-login">
                {t("login.button") || "Log In"}
              </Link>
            ) : (
              <Link to="/profile" className="ch-mobile__user-badge">
                <span className="ch-mobile__user-avatar" aria-hidden="true">
                  {(user.username || "U").charAt(0).toUpperCase()}
                </span>
                <span className="ch-mobile__user-name">{user.username}</span>
              </Link>
            )}
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      {/* Offline Prompt Modal Dialog */}
      {showOfflineModal && (
        <div
          className="ch-offline-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ch-offline-modal-title"
        >
          <div className="ch-offline-modal-card">
            <div className="ch-offline-modal-icon">
              <Icon name="wifi-off" size={26} />
            </div>
            <h3 id="ch-offline-modal-title">
              {t("common.offlineTitle") || "You’re offline"}
            </h3>
            <p className="ch-offline-modal-text">
              {t("common.offlineText") || "We’ll load recent posts when your connection is restored."}
            </p>
            <button
              type="button"
              className="ch-offline-modal-btn"
              onClick={handleDismissOffline}
              autoFocus
            >
              {t("common.offlineBtn") || "Okay"}
            </button>
          </div>
        </div>
      )}

      {/* Main Landmark for Accessibility */}
      <main id="main-content" tabIndex="-1" className="ch-mobile__body">
        <div className="ch-mobile__body-inner">
          {children}
        </div>
      </main>

      {!hideNav && (
        <nav className="ch-mobile__nav" aria-label="Main Navigation">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              aria-current={({ isActive }) => (isActive ? "page" : undefined)}
              className={({ isActive }) =>
                `ch-mobile__navitem${isActive ? " ch-mobile__navitem--active" : ""}`
              }
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
