import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DesktopLayout from "../layouts/DesktopLayout";
import Card from "../components/Card";
import StatCard from "../components/StatCard";
import Button from "../components/Button";
import { api, ApiError } from "../lib/api";
import "./ResearcherDashboardPage.css";
import "./SurveyResponsesPage.css";

function tally(question, responses) {
  const counts = {};
  const options = question.type === "yes_no" ? ["Yes", "No"] : question.type === "rating" ? ["1", "2", "3", "4", "5"] : question.options || [];
  for (const opt of options) counts[opt] = 0;

  let answered = 0;
  for (const r of responses) {
    const answer = r.answers.find((a) => a.question_id === question.id);
    if (!answer || answer.value == null) continue;
    const values = Array.isArray(answer.value) ? answer.value : [answer.value];
    if (values.length === 0) continue;
    answered += 1;
    for (const v of values) {
      counts[v] = (counts[v] || 0) + 1;
    }
  }
  return { counts, options, answered };
}

function textAnswers(question, responses) {
  return responses
    .map((r) => r.answers.find((a) => a.question_id === question.id))
    .filter((a) => a && a.value)
    .map((a) => a.value);
}

const CHOICE_TYPES = new Set(["multiple_choice", "checkbox", "rating", "yes_no"]);

export default function SurveyResponsesPage() {
  const { studyId } = useParams();
  const navigate = useNavigate();
  const [survey, setSurvey] = useState(null);
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    Promise.all([api.getStudySurvey(studyId), api.getStudySurveyResponses(studyId)])
      .then(([surveyData, responsesData]) => {
        setSurvey(surveyData);
        setResponses(responsesData.responses);
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) {
          setError("This study doesn't have a survey yet.");
        } else {
          setError(err instanceof ApiError ? err.detail : "Could not load responses.");
        }
      })
      .finally(() => setLoading(false));
  }, [studyId]);

  return (
    <DesktopLayout
      eyebrow="SURVEY RESPONSES"
      rightSlot={
        <Button variant="secondary" onClick={() => navigate("/researcher")}>
          Back to dashboard
        </Button>
      }
    >
      <div className="ch-desktop__heading">
        <h1>Responses</h1>
        <p>See what participants have answered so far.</p>
      </div>

      {loading && <p className="ch-dash-empty">Loading…</p>}
      {error && <p className="ch-dash-empty ch-dash-empty--error">{error}</p>}

      {!loading && !error && survey && (
        <>
          <div className="ch-stats-row">
            <StatCard label="TOTAL RESPONSES" value={String(responses.length)} />
            <StatCard label="QUESTIONS" value={String(survey.questions.length)} />
          </div>

          {responses.length === 0 && (
            <Card title="No responses yet">
              <p className="ch-dash-empty">Nobody has submitted this survey yet — check back later.</p>
            </Card>
          )}

          {responses.length > 0 &&
            survey.questions.map((q, idx) => {
              if (CHOICE_TYPES.has(q.type)) {
                const { counts, options, answered } = tally(q, responses);
                const max = Math.max(1, ...Object.values(counts));
                return (
                  <Card title={`Q${idx + 1}. ${q.prompt}`} key={q.id}>
                    <div className="ch-response-bars">
                      {options.map((opt) => (
                        <div className="ch-response-bar" key={opt}>
                          <div className="ch-response-bar__label">
                            <span>{opt}</span>
                            <span>{counts[opt] || 0}</span>
                          </div>
                          <div className="ch-response-bar__track">
                            <div
                              className="ch-response-bar__fill"
                              style={{ width: `${((counts[opt] || 0) / max) * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="ch-response-meta">{answered} of {responses.length} responded</p>
                  </Card>
                );
              }

              const texts = textAnswers(q, responses);
              return (
                <Card title={`Q${idx + 1}. ${q.prompt}`} key={q.id}>
                  {texts.length === 0 && <p className="ch-dash-empty">No answers yet.</p>}
                  {texts.map((text, i) => (
                    <p className="ch-response-text" key={i}>
                      {text}
                    </p>
                  ))}
                </Card>
              );
            })}
        </>
      )}
    </DesktopLayout>
  );
}
