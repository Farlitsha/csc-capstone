import Button from "./Button";
import Icon from "./Icon";
import "./ConfirmModal.css";

/**
 * Universal Confirmation Pop-up Modal
 * Replaces native browser window.confirm() dialogs with accessible, themed modals.
 */
export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Are you sure?",
  message = "Please confirm your action to proceed.",
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger", // "danger" | "warning" | "accent" | "primary"
  icon = "alert-triangle",
  loading = false,
}) {
  if (!isOpen) return null;

  const toneClass = `ch-confirm-modal__icon-wrap--${variant}`;

  return (
    <div
      className="ch-confirm-modal-overlay"
      onClick={() => !loading && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ch-confirm-modal-title"
    >
      <div className="ch-confirm-modal" onClick={(e) => e.stopPropagation()}>
        <div className={`ch-confirm-modal__icon-wrap ${toneClass}`}>
          <Icon name={icon} size={26} />
        </div>

        <h2 id="ch-confirm-modal-title" className="ch-confirm-modal__title">
          {title}
        </h2>

        <p className="ch-confirm-modal__message">{message}</p>

        <div className="ch-confirm-modal__actions">
          <Button
            variant={variant === "danger" ? "danger" : variant === "accent" ? "accent" : "primary"}
            fullWidth
            disabled={loading}
            onClick={onConfirm}
          >
            {loading ? "Processing…" : confirmText}
          </Button>
          <Button
            variant="secondary"
            fullWidth
            disabled={loading}
            onClick={onClose}
          >
            {cancelText}
          </Button>
        </div>
      </div>
    </div>
  );
}

