import { useNavigate, useLocation } from "react-router-dom";
import Button from "./Button";
import Icon from "./Icon";
import { useLanguage } from "../i18n/LanguageContext";
import "./GuestAuthModal.css";

export default function GuestAuthModal({
  isOpen,
  onClose,
  title,
  message,
  actionName,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();

  if (!isOpen) return null;

  function handleSignup() {
    onClose();
    navigate("/signup", { state: { from: location.pathname } });
  }

  function handleLogin() {
    onClose();
    navigate("/login", { state: { from: location.pathname } });
  }

  const modalTitle = title || t("guest.modalTitle");
  const modalMessage = actionName
    ? t("guest.actionPrompt").replace("{action}", actionName)
    : (message || t("guest.modalMessage"));

  return (
    <div className="ch-guest-modal-overlay" onClick={onClose}>
      <div className="ch-guest-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ch-guest-modal__icon-wrap">
          <Icon name="lock" size={26} />
        </div>

        <div className="ch-guest-modal__badge">
          <Icon name="eye" size={13} />
          <span>{t("guest.badge")}</span>
        </div>

        <h2 className="ch-guest-modal__title">{modalTitle}</h2>

        <p className="ch-guest-modal__message">{modalMessage}</p>

        <div className="ch-guest-modal__actions">
          <Button variant="accent" fullWidth onClick={handleSignup}>
            {t("guest.createAccount")}
          </Button>
          <Button variant="secondary" fullWidth onClick={handleLogin}>
            {t("guest.loginExisting")}
          </Button>
          <button type="button" className="ch-guest-modal__dismiss" onClick={onClose}>
            {t("guest.continueBrowsing")}
          </button>
        </div>
      </div>
    </div>
  );
}

