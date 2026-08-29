import { useState } from "react";
import { useNavigate } from "react-router-dom";
import DesktopLayout from "../layouts/DesktopLayout";
import Field from "../components/Field";
import Button from "../components/Button";
import Card from "../components/Card";
import { api, ApiError } from "../lib/api";
import "./BuildSurveyPage.css";

// The actual question builder lives in LimeSurvey (see backend/app/limesurvey.py) -
// CommHub just stores study metadata + the LimeSurvey survey ID it links to.
// These sample questions mirror the Figma mock and aren't sent anywhere yet.
const SAMPLE_QUESTIONS = [
  { id: "Q1", type: "MULTIPLE CHOICE", text: "Do you use the iNethi network daily?" },
  { id: "Q2", type: "RATING", text: "How would you rate your connection speed?" },
  { id: "Q3", type: "TEXT", text: "What would improve your experience?" },
];

export default function BuildSurveyPage() {
  const navigate = useNavigate();
  const [requireConsent, setRequireConsent] = useState(true);
  const [form, setForm] = useState({
    title: "",
    description: "",
    honorarium: "",
    participant_limit: "",
    closing_date: "",
    limesurvey_survey_id: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const payload = {
        title: form.title,
        description: form.description,
        honorarium: form.honorarium || undefined,
        participant_limit: form.participant_limit ? Number(form.participant_limit) : undefined,
        closing_date: form.closing_date ? new Date(form.closing_date).toISOString() : undefined,
        limesurvey_survey_id: form.limesurvey_survey_id ? Number(form.limesurvey_survey_id) : undefined,
      };
      await api.createStudy(payload);
      navigate("/researcher");
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Could not save this study.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DesktopLayout
      eyebrow="BUILD A SURVEY"
      rightSlot={
        <>
          <Button variant="secondary" onClick={() => navigate("/researcher")}>
            Cancel
          </Button>
          <Button variant="accent" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Publishing…" : "Publish study"}
          </Button>
        </>
      }
    >
      <div className="ch-survey-builder">
        <form className="ch-survey-main" onSubmit={handleSubmit}>
          <Field
            label="Survey title"
            id="title"
            placeholder="e.g. Community wifi usage survey"
            value={form.title}
            onChange={update("title")}
            required
          />
          <Field
            label="Purpose / description"
            id="description"
            as="textarea"
            placeholder="What is this survey for, and who should take it?"
            value={form.description}
            onChange={update("description")}
            required
          />

          <Field
            label="LimeSurvey survey ID"
            id="limesurvey_survey_id"
            type="number"
            placeholder="e.g. 123456 — build the actual questions in LimeSurvey, then paste its ID here"
            value={form.limesurvey_survey_id}
            onChange={update("limesurvey_survey_id")}
          />

          <div className="ch-consent-panel">
            <div className="ch-consent-panel__top">
              <span>Require informed consent before entry</span>
              <button
                type="button"
                className={`ch-toggle${requireConsent ? " ch-toggle--on" : ""}`}
                onClick={() => setRequireConsent((v) => !v)}
                aria-pressed={requireConsent}
              >
                <span className="ch-toggle__knob" />
              </button>
            </div>
            <p>Participants must accept a consent statement before their first response is recorded.</p>
          </div>

          <div className="ch-questions-head">
            <h2>Questions</h2>
            <span className="ch-questions-hint">Managed in LimeSurvey</span>
          </div>
          {SAMPLE_QUESTIONS.map((q) => (
            <div className="ch-question-card" key={q.id}>
              <div className="ch-question-card__head">
                <span>{q.id}</span>
                <span className="ch-question-card__type">{q.type}</span>
              </div>
              <p>{q.text}</p>
            </div>
          ))}

          {error && <p className="ch-survey-error">{error}</p>}
        </form>

        <aside className="ch-survey-settings">
          <Card title="Study settings">
            <div className="ch-settings-fields">
              <Field
                label="Honorarium amount"
                id="honorarium"
                placeholder="R50 (airtime)"
                value={form.honorarium}
                onChange={update("honorarium")}
              />
              <Field
                label="Participant limit"
                id="participant_limit"
                type="number"
                placeholder="50 participants"
                value={form.participant_limit}
                onChange={update("participant_limit")}
              />
              <Field
                label="Closing date"
                id="closing_date"
                type="date"
                value={form.closing_date}
                onChange={update("closing_date")}
              />
            </div>
          </Card>

          <Card title="How this appears to members">
            <div className="ch-preview-card">
              <p className="ch-preview-card__title">{form.title || "Untitled survey"}</p>
              <p className="ch-preview-card__meta">
                {requireConsent ? "Consent required" : "No consent step"}
              </p>
              {form.honorarium && <span className="ch-preview-card__chip">{form.honorarium}</span>}
            </div>
          </Card>
        </aside>
      </div>
    </DesktopLayout>
  );
}
