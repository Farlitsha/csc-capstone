import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import MobileLayout from "../layouts/MobileLayout";
import Button from "../components/Button";
import Icon from "../components/Icon";
import Spinner from "../components/Spinner";
import ConsentPreamble from "../components/ConsentPreamble";
import ConfirmModal from "../components/ConfirmModal";
import { api, ApiError } from "../lib/api";
import { useLanguage } from "../i18n/LanguageContext";
import "./TakeSurveyPage.css";

const RATING_VALUES = ["1", "2", "3", "4", "5"];

export default function TakeSurveyPage() {
  const { studyId } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [study, setStudy] = useState(null);
  const [survey, setSurvey] = useState(null);
  const [answers, setAnswers] = useState({});
  const [consentGiven, setConsentGiven] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [unapplyConfirmOpen, setUnapplyConfirmOpen] = useState(false);
  const [unapplying, setUnapplying] = useState(false);

  const errorRef = useRef(null);


  useEffect(() => {
    setLoading(true);
    setLoadError("");

    Promise.all([
      api.getStudy(studyId).catch(() => null),
      api.getStudySurvey(studyId),
    ])
      .then(([studyData, surveyData]) => {
        setStudy(studyData);
        setSurvey(surveyData);
        setAnswers({});
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) {
          setLoadError("This study doesn't have a survey to take yet.");
        } else {
          setLoadError(err instanceof ApiError ? err.detail : "Could not load this survey.");
        }
      })
      .finally(() => setLoading(false));
  }, [studyId]);

  function setAnswer(questionId, value) {
    setAnswers((a) => ({ ...a, [questionId]: value }));
  }

  function toggleCheckboxOption(questionId, option) {
    setAnswers((a) => {
      const current = Array.isArray(a[questionId]) ? a[questionId] : [];
      const next = current.includes(option) ? current.filter((o) => o !== option) : [...current, option];
      return { ...a, [questionId]: next };
    });
  }

  function isEmpty(value) {
    return value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0);
  }

  useEffect(() => {
    if (submitError && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [submitError]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitError("");

    if (!consentGiven) {
      setSubmitError("Please review and agree to the informed consent preamble before submitting your survey.");
      return;
    }

    if (!survey || !survey.questions || survey.questions.length === 0) {
      setSubmitError("No questions found in this survey.");
      return;
    }

    for (const q of survey.questions) {
      if (q.required && isEmpty(answers[q.id])) {
        setSubmitError(`"${q.prompt}" is required.`);
        return;
      }
    }

    const payload = survey.questions
      .filter((q) => !isEmpty(answers[q.id]))
      .map((q) => ({ question_id: q.id, value: answers[q.id] }));

    setSubmitting(true);
    try {
      await api.submitSurveyResponse(studyId, { answers: payload });
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.detail : "Could not submit your answers.");
      if (errorRef.current) {
        errorRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    } finally {
      setSubmitting(false);
    }
  }

  const pageTitle = study?.title || t("studies.title");

  return (
    <MobileLayout title={pageTitle} onBack={() => navigate(-1)} hideNav>
      <div className="ch-take-survey">
        {loading && (
          <div className="ch-take-survey__status">
            <Spinner />
            <p style={{ marginTop: 10 }}>{t("common.loading")}</p>
          </div>
        )}

        {loadError && (
          <div className="ch-take-survey__status ch-take-survey__status--error" role="alert">
            <p>{loadError}</p>
            <Button variant="secondary" onClick={() => navigate("/studies")} style={{ marginTop: 16 }}>
              Back to studies
            </Button>
          </div>
        )}

        {!loading && !loadError && submitted && (
          <div className="ch-take-survey__done-card">
            <div className="ch-take-survey__done-icon">
              <Icon name="check-circle" size={48} />
            </div>
            <h2 className="ch-take-survey__done-title">Survey Submitted Successfully!</h2>
            <p className="ch-take-survey__done-desc">
              Thank you for participating in <strong>{study?.title || "this research study"}</strong>. Your answers have been securely recorded.
            </p>
            <div className="ch-take-survey__done-actions">
              <Button variant="accent" fullWidth onClick={() => navigate("/studies")}>
                Back to Research Studies
              </Button>
            </div>
          </div>
        )}

        {!loading && !loadError && !submitted && survey && (
          <form className="ch-take-survey__form" onSubmit={handleSubmit}>
            {/* Expanded Informed Consent Preamble */}
            <ConsentPreamble
              title={`${study?.title || "Research Study"} • Informed Consent`}
              subtitle={study?.description || undefined}
              consentChecked={consentGiven}
              onConsentChange={setConsentGiven}
              requireExplicitConsent={true}
            />

            {survey.questions.map((q, idx) => (
              <div className="ch-tq-card" key={q.id}>
                <p className="ch-tq-prompt">
                  {idx + 1}. {q.prompt}
                  {q.required && <span className="ch-tq-required">*</span>}
                </p>

                {q.type === "short_text" && (
                  <input
                    className="ch-tq-input"
                    value={answers[q.id] || ""}
                    placeholder="Type your answer…"
                    onChange={(e) => setAnswer(q.id, e.target.value)}
                  />
                )}

                {q.type === "long_text" && (
                  <textarea
                    className="ch-tq-input ch-tq-input--area"
                    rows={4}
                    value={answers[q.id] || ""}
                    placeholder="Type your answer…"
                    onChange={(e) => setAnswer(q.id, e.target.value)}
                  />
                )}

                {q.type === "multiple_choice" && (
                  <div className="ch-tq-options">
                    {(q.options || []).map((opt) => (
                      <label className="ch-tq-option" key={opt}>
                        <input
                          type="radio"
                          name={`q-${q.id}`}
                          value={opt}
                          checked={answers[q.id] === opt}
                          onChange={() => setAnswer(q.id, opt)}
                        />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                )}

                {q.type === "checkbox" && (
                  <div className="ch-tq-options">
                    {(q.options || []).map((opt) => (
                      <label className="ch-tq-option" key={opt}>
                        <input
                          type="checkbox"
                          checked={Array.isArray(answers[q.id]) && answers[q.id].includes(opt)}
                          onChange={() => toggleCheckboxOption(q.id, opt)}
                        />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                )}

                {q.type === "rating" && (
                  <div className="ch-tq-rating">
                    {RATING_VALUES.map((v) => (
                      <button
                        type="button"
                        key={v}
                        className={`ch-tq-rating__btn${answers[q.id] === v ? " ch-tq-rating__btn--active" : ""}`}
                        onClick={() => setAnswer(q.id, v)}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                )}

                {q.type === "yes_no" && (
                  <div className="ch-tq-options ch-tq-options--row">
                    {["Yes", "No"].map((opt) => (
                      <label className="ch-tq-option" key={opt}>
                        <input
                          type="radio"
                          name={`q-${q.id}`}
                          value={opt}
                          checked={answers[q.id] === opt}
                          onChange={() => setAnswer(q.id, opt)}
                        />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ))}

            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "10px" }}>
              {submitError && (
                <p
                  ref={errorRef}
                  role="alert"
                  className="ch-take-survey__error-text"
                  style={{
                    color: "#dc2626",
                    fontSize: "14px",
                    fontWeight: 500,
                    margin: 0,
                    padding: 0,
                    lineHeight: 1.4,
                  }}
                >
                  {submitError}
                </p>
              )}
              <Button type="submit" variant="accent" fullWidth disabled={submitting || unapplying}>
                {submitting ? "Submitting…" : "Submit answers"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                fullWidth
                disabled={submitting || unapplying}
                onClick={() => setUnapplyConfirmOpen(true)}
              >
                <Icon name="user-minus" size={14} style={{ marginRight: 6 }} />
                Unapply & Withdraw from Study
              </Button>
            </div>
          </form>
        )}
      </div>

      <ConfirmModal
        isOpen={unapplyConfirmOpen}
        onClose={() => !unapplying && setUnapplyConfirmOpen(false)}
        onConfirm={async () => {
          setUnapplying(true);
          try {
            await api.unapplyFromStudy(studyId);
            setUnapplyConfirmOpen(false);
            navigate("/studies");
          } catch (err) {
            alert(err instanceof ApiError ? err.detail : "Could not unapply.");
          } finally {
            setUnapplying(false);
          }
        }}
        title="Unapply from Study"
        message="Are you sure you want to unapply and withdraw your application from this research study? Your draft answers will not be saved."
        confirmText="Yes, Unapply & Leave"
        cancelText="Keep Taking Survey"
        variant="danger"
        icon="user-minus"
        loading={unapplying}
      />
    </MobileLayout>
  );
}

