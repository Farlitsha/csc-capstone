import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import MobileLayout from "../layouts/MobileLayout";
import Button from "../components/Button";
import { api, ApiError } from "../lib/api";
import { useLanguage } from "../i18n/LanguageContext";
import "./TakeSurveyPage.css";

const RATING_VALUES = ["1", "2", "3", "4", "5"];

export default function TakeSurveyPage() {
  const { studyId } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [survey, setSurvey] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    setLoading(true);
    setLoadError("");
    api
      .getStudySurvey(studyId)
      .then((data) => {
        setSurvey(data);
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

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitError("");

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
      await api.submitSurveyResponse(studyId, payload);
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.detail : "Could not submit your answers.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <MobileLayout title={survey?.title || t("studies.title")} onBack={() => navigate(-1)} hideNav>
      <div className="ch-take-survey">
        {loading && <p className="ch-take-survey__status">{t("common.loading")}</p>}

        {loadError && (
          <div className="ch-take-survey__status ch-take-survey__status--error">
            <p>{loadError}</p>
          </div>
        )}

        {!loading && !loadError && submitted && (
          <div className="ch-take-survey__done">
            <p className="ch-take-survey__done-title">Thanks for taking part!</p>
            <p className="ch-take-survey__done-meta">Your answers have been recorded.</p>
            <Button variant="accent" onClick={() => navigate("/studies")}>
              Back to studies
            </Button>
          </div>
        )}

        {!loading && !loadError && !submitted && survey && (
          <form className="ch-take-survey__form" onSubmit={handleSubmit}>
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
                    onChange={(e) => setAnswer(q.id, e.target.value)}
                  />
                )}

                {q.type === "long_text" && (
                  <textarea
                    className="ch-tq-input ch-tq-input--area"
                    rows={4}
                    value={answers[q.id] || ""}
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
                        {opt}
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
                        {opt}
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
                        {opt}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {submitError && <p className="ch-take-survey__error">{submitError}</p>}

            <Button type="submit" variant="accent" fullWidth disabled={submitting}>
              {submitting ? "Submitting…" : "Submit answers"}
            </Button>
          </form>
        )}
      </div>
    </MobileLayout>
  );
}
