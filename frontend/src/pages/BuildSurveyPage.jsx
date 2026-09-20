import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DesktopLayout from "../layouts/DesktopLayout";
import Field from "../components/Field";
import Button from "../components/Button";
import Card from "../components/Card";
import Icon from "../components/Icon";
import Spinner from "../components/Spinner";
import { api, ApiError } from "../lib/api";
import { useAuth } from "../auth/AuthContext";
import "./BuildSurveyPage.css";

// CommHub's own in-house survey builder - questions are stored and rendered by
// CommHub itself (see backend/app/models.py: Survey/SurveyQuestion), no more
// linking out to an external survey tool.
const QUESTION_TYPES = [
  { value: "short_text", label: "Short answer" },
  { value: "long_text", label: "Paragraph" },
  { value: "multiple_choice", label: "Multiple choice" },
  { value: "checkbox", label: "Checkboxes" },
  { value: "rating", label: "Rating (1–5)" },
  { value: "yes_no", label: "Yes / No" },
];

const HAS_OPTIONS = new Set(["multiple_choice", "checkbox"]);

let nextKey = 1;
function makeQuestion() {
  return {
    key: nextKey++,
    type: "short_text",
    prompt: "",
    required: true,
    options: ["", ""],
  };
}

export default function BuildSurveyPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { studyId } = useParams();
  const isEditMode = Boolean(studyId);

  const [requireConsent, setRequireConsent] = useState(true);
  const [form, setForm] = useState({
    title: "",
    description: "",
    honorarium: "",
    participant_limit: "",
    closing_date: "",
  });
  const [questions, setQuestions] = useState([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loadingStudy, setLoadingStudy] = useState(isEditMode);
  const [responseCount, setResponseCount] = useState(0);
  const [canEditQuestions, setCanEditQuestions] = useState(true);

  useEffect(() => {
    if (!studyId) return;
    setLoadingStudy(true);
    setError("");

    Promise.all([
      api.getStudy(studyId),
      api.getStudySurvey(studyId).catch(() => null),
      api.getStudySurveyResponses(studyId).catch(() => ({ responses: [] })),
    ])
      .then(([studyData, surveyData, responsesData]) => {
        // Enforce ownership: researchers cannot view/edit other researchers' studies
        if (user && studyData.researcher_id && studyData.researcher_id !== user.id && user.role !== "admin") {
          setError("You do not have permission to view or edit another researcher's study.");
          return;
        }

        setForm({
          title: studyData.title || "",
          description: studyData.description || "",
          honorarium: studyData.honorarium || "",
          participant_limit: studyData.participant_limit ? String(studyData.participant_limit) : "",
          closing_date: studyData.closing_date ? studyData.closing_date.slice(0, 10) : "",
        });

        const respCount = responsesData?.responses?.length || surveyData?.response_count || 0;
        setResponseCount(respCount);
        const editable = respCount === 0;
        setCanEditQuestions(editable);

        if (surveyData?.questions && surveyData.questions.length > 0) {
          setQuestions(
            surveyData.questions.map((q, idx) => ({
              key: idx + 1,
              id: q.id,
              type: q.type,
              prompt: q.prompt,
              required: q.required !== false,
              options: q.options && q.options.length ? q.options : ["", ""],
            }))
          );
        }
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.detail : "Could not load study details.");
      })
      .finally(() => setLoadingStudy(false));
  }, [studyId, user]);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  function addQuestion() {
    if (!canEditQuestions) return;
    setQuestions((qs) => [...qs, makeQuestion()]);
  }

  function updateQuestion(key, patch) {
    if (!canEditQuestions) return;
    setQuestions((qs) => qs.map((q) => (q.key === key ? { ...q, ...patch } : q)));
  }

  function changeType(key, type) {
    if (!canEditQuestions) return;
    setQuestions((qs) =>
      qs.map((q) => {
        if (q.key !== key) return q;
        const needsOptions = HAS_OPTIONS.has(type);
        return { ...q, type, options: needsOptions ? (q.options?.length ? q.options : ["", ""]) : q.options };
      })
    );
  }

  function removeQuestion(key) {
    if (!canEditQuestions) return;
    setQuestions((qs) => qs.filter((q) => q.key !== key));
  }

  function moveQuestion(key, direction) {
    if (!canEditQuestions) return;
    setQuestions((qs) => {
      const idx = qs.findIndex((q) => q.key === key);
      const swapWith = idx + direction;
      if (idx === -1 || swapWith < 0 || swapWith >= qs.length) return qs;
      const next = [...qs];
      [next[idx], next[swapWith]] = [next[swapWith], next[idx]];
      return next;
    });
  }

  function updateOption(key, optIdx, value) {
    if (!canEditQuestions) return;
    setQuestions((qs) =>
      qs.map((q) => (q.key === key ? { ...q, options: q.options.map((o, i) => (i === optIdx ? value : o)) } : q))
    );
  }

  function addOption(key) {
    if (!canEditQuestions) return;
    setQuestions((qs) => qs.map((q) => (q.key === key ? { ...q, options: [...q.options, ""] } : q)));
  }

  function removeOption(key, optIdx) {
    if (!canEditQuestions) return;
    setQuestions((qs) =>
      qs.map((q) => (q.key === key ? { ...q, options: q.options.filter((_, i) => i !== optIdx) } : q))
    );
  }

  function validateQuestions() {
    for (const q of questions) {
      if (!q.prompt.trim()) return "Every question needs a prompt.";
      if (HAS_OPTIONS.has(q.type)) {
        const filled = q.options.filter((o) => o.trim());
        if (filled.length < 2) return `"${q.prompt || "Untitled question"}" needs at least two options.`;
      }
    }
    return "";
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!form.title.trim() || !form.description.trim()) {
      setError("Title and description are required.");
      return;
    }

    if (canEditQuestions) {
      const questionError = validateQuestions();
      if (questionError) {
        setError(questionError);
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        honorarium: form.honorarium?.trim() || undefined,
        participant_limit: form.participant_limit ? Number(form.participant_limit) : undefined,
        closing_date: form.closing_date ? new Date(form.closing_date).toISOString() : undefined,
      };

      if (canEditQuestions) {
        payload.questions = questions.map((q) => ({
          type: q.type,
          prompt: q.prompt.trim(),
          required: q.required,
          options: HAS_OPTIONS.has(q.type) ? q.options.map((o) => o.trim()).filter(Boolean) : undefined,
        }));
      }

      if (isEditMode) {
        await api.updateStudy(studyId, payload);
      } else {
        await api.createStudy(payload);
      }
      navigate("/researcher");
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Could not save this study.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingStudy) {
    return (
      <DesktopLayout eyebrow="STUDY & SURVEY BUILDER">
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <Spinner />
          <p style={{ marginTop: "12px", color: "var(--color-sage)" }}>Loading study details…</p>
        </div>
      </DesktopLayout>
    );
  }

  if (error && isEditMode && !form.title) {
    return (
      <DesktopLayout eyebrow="STUDY & SURVEY BUILDER">
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <p className="ch-survey-error" style={{ fontSize: "16px", marginBottom: "20px" }}>{error}</p>
          <Button variant="secondary" onClick={() => navigate("/researcher")}>
            Return to Researcher Dashboard
          </Button>
        </div>
      </DesktopLayout>
    );
  }

  return (
    <DesktopLayout
      eyebrow={isEditMode ? "EDIT STUDY & SURVEY" : "BUILD A SURVEY"}
      rightSlot={
        <>
          <Button variant="secondary" onClick={() => navigate("/researcher")}>
            Cancel
          </Button>
          <Button variant="accent" onClick={handleSubmit} disabled={submitting}>
            {submitting ? (isEditMode ? "Saving…" : "Publishing…") : (isEditMode ? "Save changes" : "Publish study")}
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
            <span className="ch-questions-hint">{questions.length} question{questions.length === 1 ? "" : "s"}</span>
          </div>

          {isEditMode && !canEditQuestions && (
            <div style={{
              background: "#fef2f2",
              border: "1px solid #f87171",
              borderRadius: "8px",
              padding: "12px 16px",
              marginBottom: "16px",
              color: "#991b1b",
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
            }}>
              <Icon name="info" size={20} style={{ flexShrink: 0, marginTop: 2, color: "#dc2626" }} />
              <div>
                <strong style={{ fontSize: "14px" }}>Questions Locked</strong>
                <p style={{ margin: "3px 0 0", fontSize: "13px", color: "#b91c1c", lineHeight: 1.4 }}>
                  {responseCount === 1 ? "1 participant has" : `${responseCount} participants have`} already taken this survey. Survey questions cannot be changed or deleted once responses exist to protect research data integrity. (You can still update the study title, description, and settings.)
                </p>
              </div>
            </div>
          )}

          {isEditMode && canEditQuestions && (
            <div style={{
              background: "#ecfdf5",
              border: "1px solid #6ee7b7",
              borderRadius: "8px",
              padding: "12px 16px",
              marginBottom: "16px",
              color: "#065f46",
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
            }}>
              <Icon name="info" size={20} style={{ flexShrink: 0, marginTop: 2, color: "#059669" }} />
              <div>
                <strong style={{ fontSize: "14px" }}>Questions Editable</strong>
                <p style={{ margin: "3px 0 0", fontSize: "13px", color: "#047857", lineHeight: 1.4 }}>
                  No participants have taken this survey yet. You can freely edit, reorder, add, or remove questions.
                </p>
              </div>
            </div>
          )}

          {questions.length === 0 && (
            <p className="ch-questions-empty">No questions yet — add one below to start building your survey.</p>
          )}

          {questions.map((q, idx) => (
            <div className={`ch-question-card ${canEditQuestions ? "ch-question-card--editable" : ""}`} key={q.key}>
              <div className="ch-question-card__head">
                <span>Q{idx + 1}</span>
                {canEditQuestions && (
                  <div className="ch-question-card__head-actions">
                    <button
                      type="button"
                      className="ch-icon-btn"
                      onClick={() => moveQuestion(q.key, -1)}
                      disabled={idx === 0}
                      aria-label="Move question up"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="ch-icon-btn"
                      onClick={() => moveQuestion(q.key, 1)}
                      disabled={idx === questions.length - 1}
                      aria-label="Move question down"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="ch-icon-btn ch-icon-btn--danger"
                      onClick={() => removeQuestion(q.key)}
                      aria-label="Remove question"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>

              <Field
                label="Question"
                id={`q-${q.key}-prompt`}
                placeholder="e.g. How would you rate your connection speed?"
                value={q.prompt}
                disabled={!canEditQuestions}
                onChange={(e) => updateQuestion(q.key, { prompt: e.target.value })}
              />

              <div className="ch-question-card__row">
                <Field
                  label="Answer type"
                  id={`q-${q.key}-type`}
                  as="select"
                  value={q.type}
                  disabled={!canEditQuestions}
                  onChange={(e) => changeType(q.key, e.target.value)}
                >
                  {QUESTION_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </Field>

                <label className="ch-question-card__required" style={!canEditQuestions ? { opacity: 0.7, cursor: "not-allowed" } : {}}>
                  <input
                    type="checkbox"
                    checked={q.required}
                    disabled={!canEditQuestions}
                    onChange={(e) => updateQuestion(q.key, { required: e.target.checked })}
                  />
                  Required
                </label>
              </div>

              {HAS_OPTIONS.has(q.type) && (
                <div className="ch-options-editor">
                  <span className="ch-options-editor__label">Options</span>
                  {q.options.map((opt, optIdx) => (
                    <div className="ch-options-editor__row" key={optIdx}>
                      <input
                        className="ch-options-editor__input"
                        value={opt}
                        disabled={!canEditQuestions}
                        placeholder={`Option ${optIdx + 1}`}
                        onChange={(e) => updateOption(q.key, optIdx, e.target.value)}
                      />
                      {canEditQuestions && (
                        <button
                          type="button"
                          className="ch-icon-btn ch-icon-btn--danger"
                          onClick={() => removeOption(q.key, optIdx)}
                          disabled={q.options.length <= 2}
                          aria-label="Remove option"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                  {canEditQuestions && (
                    <button type="button" className="ch-options-editor__add" onClick={() => addOption(q.key)}>
                      + Add option
                    </button>
                  )}
                </div>
              )}

              {q.type === "rating" && <p className="ch-question-card__note">Participants pick a number from 1 to 5.</p>}
              {q.type === "yes_no" && <p className="ch-question-card__note">Participants pick Yes or No.</p>}
            </div>
          ))}

          {canEditQuestions && (
            <Button type="button" variant="secondary" onClick={addQuestion}>
              + Add question
            </Button>
          )}

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
                {requireConsent ? "Consent required" : "No consent step"} · {questions.length} question
                {questions.length === 1 ? "" : "s"}
              </p>
              {form.honorarium && <span className="ch-preview-card__chip">{form.honorarium}</span>}
            </div>
          </Card>
        </aside>
      </div>
    </DesktopLayout>
  );
}
