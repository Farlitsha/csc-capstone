import { useState, useEffect } from "react";
import { useAuth } from "../auth/AuthContext";
import { useLanguage } from "../i18n/LanguageContext";
import { useIsPhone } from "../hooks/useIsPhone";
import "./ResearcherMobileNoticeModal.css";

// Global session memory so dismiss persists across pages during the active session
let sessionDismissed = false;

export default function ResearcherMobileNoticeModal() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const isPhone = useIsPhone();
  const [visible, setVisible] = useState(false);

  const isResearcher = user?.role === "researcher";

  useEffect(() => {
    if (isResearcher && isPhone && !sessionDismissed) {
      setVisible(true);
    } else {
      setVisible(false);
    }
  }, [isResearcher, isPhone]);

  if (!visible) return null;

  function handleDismiss() {
    sessionDismissed = true;
    setVisible(false);
  }

  return (
    <div
      className="ch-researcher-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ch-researcher-notice-title"
    >
      <div className="ch-researcher-modal-card">
        <div className="ch-researcher-modal-icon-wrap">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
        </div>

        <div className="ch-researcher-modal-badge">
          {t("profile.roleResearcher") || "Researcher Account"}
        </div>

        <h3 id="ch-researcher-notice-title" className="ch-researcher-modal-title">
          {t("researcherMobile.title") || "Larger Screen Required for Researcher Tools"}
        </h3>

        <p className="ch-researcher-modal-text">
          {t("researcherMobile.message") ||
            "To access researcher privileges (managing studies, building surveys, and scheduling workshops), please open CommHub on a larger device such as a tablet, iPad, laptop, or desktop computer."}
        </p>

        <div className="ch-researcher-modal-highlight">
          <p>
            <strong>{t("researcherMobile.currentModeTitle") || "Community Member Mode:"}</strong>{" "}
            {t("researcherMobile.currentModeDesc") ||
              "On this phone, you can browse local services, participate in community activities, and view posted studies."}
          </p>
        </div>

        <button
          type="button"
          className="ch-researcher-modal-btn"
          onClick={handleDismiss}
          autoFocus
        >
          {t("researcherMobile.actionBtn") || "Continue in Community Mode"}
        </button>
      </div>
    </div>
  );
}

