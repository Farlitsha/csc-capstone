import { useNavigate } from "react-router-dom";
import Card from "./Card";
import Button from "./Button";
import Icon from "./Icon";
import { useLanguage } from "../i18n/LanguageContext";
import "./HelpCentreCard.css";

export default function HelpCentreCard({
  title,
  showPolicyLinks = false,
  className = "",
}) {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const cardTitle = title || t("helpCentre.title") || "Need More Assistance?";
  const adminPhone = "+27 82 111 0001";
  const cleanPhone = "27821110001";
  const adminEmail = "admin@commhub.org";
  const oceanViewAddress = "Carina Close, Ocean View, Cape Town, 7975";
  const mapUrl = "https://maps.google.com/?q=Ocean+View+Multi-Purpose+Centre,+Carina+Close,+Ocean+View,+Cape+Town";
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
    "Hi Chief Administrator, I need assistance with CommHub."
  )}`;

  return (
    <Card title={cardTitle} className={`ch-help-centre-card ${className}`}>
      <div className="ch-help-centre">
        <p className="ch-help-centre__desc">
          {t("helpCentre.subtitle") ||
            "Get in-person support in Ocean View or contact the Chief Platform Administrator directly."}
        </p>

        {/* Physical In-Person Support Location */}
        <div className="ch-help-centre__section">
          <div className="ch-help-centre__section-head">
            <span className="ch-help-centre__icon-badge">
              <Icon name="location" size={15} />
            </span>
            <span>{t("helpCentre.locationTitle") || "Ocean View Community Help Desk"}</span>
          </div>

          <div className="ch-help-centre__details">
            <span className="ch-help-centre__address">
              {t("helpCentre.locationVenue") || "Ocean View Multi-Purpose Centre"}
            </span>
            <span>{t("helpCentre.locationAddress") || oceanViewAddress}</span>
            <span className="ch-help-centre__meta">
              <Icon name="clock" size={13} />
              <span>{t("helpCentre.locationHours") || "Walk-in hours: Mon – Fri, 08:30 – 16:30"}</span>
            </span>
          </div>

          <div className="ch-help-centre__actions">
            <a
              href={mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ch-help-centre__link-btn"
            >
              <Icon name="location" size={14} />
              <span>{t("helpCentre.openMaps") || "View on Map"}</span>
            </a>
          </div>
        </div>

        {/* Chief Administrator Contacts */}
        <div className="ch-help-centre__section">
          <div className="ch-help-centre__section-head">
            <span className="ch-help-centre__icon-badge">
              <Icon name="user-check" size={15} />
            </span>
            <span>{t("helpCentre.adminTitle") || "Chief Platform Administrator"}</span>
          </div>

          <div className="ch-help-centre__details">
            <span className="ch-help-centre__address">
              {t("helpCentre.adminName") || "Platform Coordinator"} (chief_admin)
            </span>
            <span className="ch-help-centre__meta">
              <Icon name="phone" size={13} />
              <span>{adminPhone}</span>
            </span>
            <span className="ch-help-centre__meta">
              <Icon name="mail" size={13} />
              <span>{adminEmail}</span>
            </span>
          </div>

          <div className="ch-help-centre__actions">
            <a
              href={`tel:${cleanPhone}`}
              className="ch-help-centre__link-btn ch-help-centre__link-btn--call"
            >
              <Icon name="phone" size={13} />
              <span>{t("helpCentre.callBtn") || "Call Admin"}</span>
            </a>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ch-help-centre__link-btn ch-help-centre__link-btn--whatsapp"
            >
              <Icon name="whatsapp" size={14} />
              <span>{t("helpCentre.whatsappBtn") || "WhatsApp"}</span>
            </a>
            <a
              href={`mailto:${adminEmail}?subject=CommHub%20Support%20Inquiry`}
              className="ch-help-centre__link-btn"
            >
              <Icon name="mail" size={13} />
              <span>{t("helpCentre.emailBtn") || "Email"}</span>
            </a>
          </div>
        </div>

        {/* Optional Policy & Guidelines links */}
        {showPolicyLinks && (
          <div className="ch-help-centre__policy-row">
            <Button
              variant="secondary"
              onClick={() => navigate("/terms")}
              className="ch-help-centre__policy-btn"
            >
              <Icon name="document" size={14} />
              <span>{t("tutorials.termsLink") || "Terms & Guidelines"}</span>
            </Button>
            <Button
              variant="secondary"
              onClick={() => navigate("/privacy")}
              className="ch-help-centre__policy-btn"
            >
              <Icon name="info" size={14} />
              <span>{t("tutorials.privacyLink") || "Privacy Policy"}</span>
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

