import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DesktopLayout from "../layouts/DesktopLayout";
import Card from "../components/Card";
import StatusChip from "../components/StatusChip";
import Button from "../components/Button";
import { api, ApiError } from "../lib/api";
import "./ResearcherDashboardPage.css";
import "./StudyApplicantsPage.css";

const STATUS_TONE = { applied: "neutral", accepted: "positive", declined: "danger" };
const STATUS_LABEL = { applied: "Awaiting review", accepted: "Accepted", declined: "Declined" };

export default function StudyApplicantsPage() {
  const { studyId } = useParams();
  const navigate = useNavigate();
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  function load() {
    setLoading(true);
    api
      .getStudyApplicants(studyId)
      .then(setApplicants)
      .catch((err) => setError(err instanceof ApiError ? err.detail : "Could not load applicants."))
      .finally(() => setLoading(false));
  }

  useEffect(load, [studyId]);

  async function handleDecision(applicationId, decision) {
    setUpdatingId(applicationId);
    try {
      const updated = await api.updateApplicationStatus(applicationId, decision);
      setApplicants((list) => list.map((a) => (a.id === applicationId ? { ...a, status: updated.status } : a)));
    } catch (err) {
      alert(err instanceof ApiError ? err.detail : "Could not update this applicant.");
    } finally {
      setUpdatingId(null);
    }
  }

  const pending = applicants.filter((a) => a.status === "applied");
  const decided = applicants.filter((a) => a.status !== "applied");

  return (
    <DesktopLayout
      eyebrow="STUDY APPLICANTS"
      rightSlot={
        <Button variant="secondary" onClick={() => navigate("/researcher")}>
          Back to dashboard
        </Button>
      }
    >
      <div className="ch-desktop__heading">
        <h1>Applicants</h1>
        <p>Review who has applied and accept or decline them.</p>
      </div>

      <Card title={`Awaiting review (${pending.length})`}>
        {loading && <p className="ch-dash-empty">Loading…</p>}
        {error && <p className="ch-dash-empty ch-dash-empty--error">{error}</p>}
        {!loading && !error && pending.length === 0 && <p className="ch-dash-empty">No pending applicants.</p>}
        {pending.map((a) => (
          <div className="ch-row" key={a.id}>
            <div>
              <p className="ch-row__title">{a.applicant_username}</p>
              <p className="ch-row__meta">
                {a.applicant_email} · Applied {new Date(a.applied_at).toLocaleDateString()}
              </p>
            </div>
            <div className="ch-applicant-actions">
              <Button
                variant="secondary"
                disabled={updatingId === a.id}
                onClick={() => handleDecision(a.id, "declined")}
              >
                Decline
              </Button>
              <Button
                variant="accent"
                disabled={updatingId === a.id}
                onClick={() => handleDecision(a.id, "accepted")}
              >
                {updatingId === a.id ? "Saving…" : "Accept"}
              </Button>
            </div>
          </div>
        ))}
      </Card>

      {decided.length > 0 && (
        <Card title="Already decided">
          {decided.map((a) => (
            <div className="ch-row" key={a.id}>
              <div>
                <p className="ch-row__title">{a.applicant_username}</p>
                <p className="ch-row__meta">{a.applicant_email}</p>
              </div>
              <StatusChip label={STATUS_LABEL[a.status] || a.status} tone={STATUS_TONE[a.status] || "neutral"} />
            </div>
          ))}
        </Card>
      )}
    </DesktopLayout>
  );
}
