import { useState } from "react";
import Icon from "./Icon";
import { useLanguage } from "../i18n/LanguageContext";
import "./ConsentPreamble.css";

export default function ConsentPreamble({
  title,
  subtitle,
  scopeTitle = "Community Survey",
  consentChecked,
  onConsentChange,
  requireExplicitConsent = true,
}) {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="ch-consent-preamble" role="region" aria-labelledby="ch-consent-preamble-heading">
      <div className="ch-consent-preamble__head">
        <div className="ch-consent-preamble__badge">
          <Icon name="info" size={14} />
          <span>{t("consent.badge") || "POPIA Informed Consent"}</span>
        </div>
        <button
          type="button"
          className="ch-consent-preamble__toggle"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          {expanded ? t("consent.collapse") || "Hide Details" : t("consent.expand") || "View Policy Details"}
        </button>
      </div>

      <h3 id="ch-consent-preamble-heading" className="ch-consent-preamble__title">
        {title || t("consent.heading") || "Informed Consent & Data Privacy Preamble"}
      </h3>
      <p className="ch-consent-preamble__desc">
        {subtitle || t("consent.description") || "Please review how your data is accessed, protected, and retained before participating in this survey."}
      </p>

      {expanded && (
        <div className="ch-consent-preamble__grid">
          {/* 1. Who has access */}
          <div className="ch-consent-pillar">
            <div className="ch-consent-pillar__icon ch-consent-pillar__icon--teal">
              <Icon name="users" size={18} />
            </div>
            <div className="ch-consent-pillar__body">
              <h4>{t("consent.accessTitle") || "1. Who Has Access to Data"}</h4>
              <p>
                {t("consent.accessDesc") ||
                  "Access is strictly limited to verified CommHub community research coordinators and authorized platform administrators for community development and local planning. Your data is NEVER sold or shared with commercial third parties, marketers, or advertisers."}
              </p>
            </div>
          </div>

          {/* 2. Confidentiality Guarantees */}
          <div className="ch-consent-pillar">
            <div className="ch-consent-pillar__icon ch-consent-pillar__icon--green">
              <Icon name="check" size={18} />
            </div>
            <div className="ch-consent-pillar__body">
              <h4>{t("consent.confidentialityTitle") || "2. Confidentiality & Anonymity"}</h4>
              <p>
                {t("consent.confidentialityDesc") ||
                  "Individual responses are kept strictly confidential and pseudonymized. Published survey outputs are aggregated into community statistics (such as unemployment rates and skills charts) so no individual can ever be personally identified."}
              </p>
            </div>
          </div>

          {/* 3. Data Retention & Erasure Policy */}
          <div className="ch-consent-pillar">
            <div className="ch-consent-pillar__icon ch-consent-pillar__icon--amber">
              <Icon name="clock" size={18} />
            </div>
            <div className="ch-consent-pillar__body">
              <h4>{t("consent.retentionTitle") || "3. Data Retention & Erasure Policy"}</h4>
              <p>
                {t("consent.retentionDesc") ||
                  "Responses are securely retained for up to 3 years for longitudinal community planning and skills tracking. Under South Africa's POPIA Act, you have the full right to access, update, or permanently delete your survey records at any time via your Profile settings."}
              </p>
            </div>
          </div>

          {/* 4. Voluntary Participation & Right to Withdraw */}
          <div className="ch-consent-pillar">
            <div className="ch-consent-pillar__icon ch-consent-pillar__icon--blue">
              <Icon name="info" size={18} />
            </div>
            <div className="ch-consent-pillar__body">
              <h4>{t("consent.voluntaryTitle") || "4. Voluntary Participation & Withdrawal"}</h4>
              <p>
                {t("consent.voluntaryDesc") ||
                  "Participation is 100% voluntary. You may skip any optional question or exit the survey at any time without any negative consequences, penalties, or loss of access to community services and workshops."}
              </p>
            </div>
          </div>
        </div>
      )}

      {requireExplicitConsent && onConsentChange && (
        <div className="ch-consent-preamble__checkbox-wrap">
          <label className="ch-consent-preamble__checkbox-label">
            <input
              type="checkbox"
              className="ch-consent-preamble__checkbox"
              checked={consentChecked}
              onChange={(e) => onConsentChange(e.target.checked)}
              required
            />
            <span>
              {t("consent.checkboxLabel") ||
                "I have read and understood this informed consent preamble. I agree to participate voluntarily under these confidentiality and data protection terms."}
            </span>
          </label>
        </div>
      )}
    </div>
  );
}

