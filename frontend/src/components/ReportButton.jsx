import { useState } from "react";
import Field from "./Field";
import Button from "./Button";
import { api, ApiError } from "../lib/api";
import { useLanguage } from "../i18n/LanguageContext";
import "./ReportButton.css";

/**
 * targetType: "service" | "study" | "user"
 * targetId: numeric id of the thing being reported
 */
export default function ReportButton({ targetType, targetId }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await api.createReport(targetType, targetId, reason);
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Could not submit this report.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return <p className="ch-report__success">{t("report.success")}</p>;
  }

  if (!open) {
    return (
      <button type="button" className="ch-report__trigger" onClick={() => setOpen(true)}>
        {t("report.button")}
      </button>
    );
  }

  return (
    <form className="ch-report__form" onSubmit={handleSubmit}>
      <Field
        label={t("report.reasonLabel")}
        id={`report-reason-${targetType}-${targetId}`}
        as="textarea"
        placeholder={t("report.reasonPlaceholder")}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        required
      />
      {error && <p className="ch-report__error">{error}</p>}
      <div className="ch-report__actions">
        <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={submitting}>
          {t("report.cancel")}
        </Button>
        <Button type="submit" variant="accent" disabled={submitting || !reason.trim()}>
          {submitting ? t("report.submitting") : t("report.submit")}
        </Button>
      </div>
    </form>
  );
}
