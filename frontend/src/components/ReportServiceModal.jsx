import { useState } from "react";
import Field from "./Field";
import Button from "./Button";
import Icon from "./Icon";
import { api, ApiError } from "../lib/api";
import "./ReportServiceModal.css";

const REPORT_PRESETS = [
  "Scam or fraudulent activity",
  "Inaccurate or misleading description",
  "Inappropriate or offensive content",
  "Unavailable or unresponsive poster",
  "Other concern",
];

export default function ReportServiceModal({ service, onClose }) {
  const [reportReason, setReportReason] = useState(REPORT_PRESETS[0]);
  const [reportDetails, setReportDetails] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [reportError, setReportError] = useState("");

  if (!service) return null;

  async function handleReportSubmit(e) {
    e.preventDefault();
    setReportSubmitting(true);
    setReportError("");
    try {
      const fullReason = reportDetails.trim()
        ? `${reportReason}: ${reportDetails.trim()}`
        : reportReason;
      await api.reportService(service.id, fullReason);
      setReportSuccess(true);
      setTimeout(() => {
        onClose();
        setReportSuccess(false);
      }, 1800);
    } catch (err) {
      setReportError(err instanceof ApiError ? err.detail : "Could not submit report.");
    } finally {
      setReportSubmitting(false);
    }
  }

  return (
    <div className="ch-edit-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="ch-edit-modal">
        <div className="ch-edit-modal__head">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Icon name="flag" size={18} style={{ color: "#dc2626" }} />
            <h3 style={{ margin: 0 }}>Report Listing</h3>
          </div>
          <button
            type="button"
            className="ch-edit-modal__close"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {reportSuccess ? (
          <div className="ch-report-success-msg">
            <Icon name="check" size={20} style={{ color: "#059669", marginBottom: "6px" }} />
            <h4>Thank you for letting us know</h4>
            <p>This listing has been flagged for administrator review to keep our community safe.</p>
          </div>
        ) : (
          <form onSubmit={handleReportSubmit} className="ch-edit-modal__form">
            <p style={{ margin: "0 0 10px", fontSize: "13px", color: "var(--color-sage)" }}>
              Help keep CommHub safe. Why are you reporting <strong>"{service.title}"</strong>?
            </p>

            {reportError && <div className="ch-edit-error">{reportError}</div>}

            <div className="ch-field-block">
              <span className="ch-field-block__label">Reason</span>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {REPORT_PRESETS.map((preset) => (
                  <label
                    key={preset}
                    className={`ch-report-option ${reportReason === preset ? "ch-report-option--selected" : ""}`}
                    onClick={() => setReportReason(preset)}
                  >
                    <input
                      type="radio"
                      name="report_reason"
                      checked={reportReason === preset}
                      onChange={() => setReportReason(preset)}
                      style={{ accentColor: "var(--color-teal-700)" }}
                    />
                    <span>{preset}</span>
                  </label>
                ))}
              </div>
            </div>

            <Field
              label="Additional details (optional)"
              id="report_details"
              as="textarea"
              placeholder="Provide any extra context to help moderators evaluate this listing..."
              value={reportDetails}
              onChange={(e) => setReportDetails(e.target.value)}
            />

            <div className="ch-edit-modal__actions">
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="accent"
                disabled={reportSubmitting}
                style={{ background: "#dc2626", borderColor: "#dc2626" }}
              >
                {reportSubmitting ? "Submitting…" : "Submit Report"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

