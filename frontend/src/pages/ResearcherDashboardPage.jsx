import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DesktopLayout from "../layouts/DesktopLayout";
import StatCard from "../components/StatCard";
import StatusChip from "../components/StatusChip";
import Button from "../components/Button";
import Card from "../components/Card";
import { api } from "../lib/api";
import { useAuth } from "../auth/AuthContext";
import "./ResearcherDashboardPage.css";

const STATE_TONE = { live: "positive", draft: "neutral", closed: "warning" };

// Booked sessions and honorarium payouts aren't backed by an endpoint yet -
// kept as illustrative content matching the Figma sample data.
const SESSIONS = [
  { id: 1, day: "05", month: "AUG", title: "Interview — N. Mahlangu", meta: "2:00pm · Consent confirmed" },
  { id: 2, day: "09", month: "AUG", title: "Feedback workshop", meta: "10:00am · 8 participants booked" },
];
const HONORARIA = [
  { id: 1, name: "N. Mahlangu", status: "Paid", tone: "positive" },
  { id: 2, name: "T. Booysen", status: "Pending", tone: "warning" },
  { id: 3, name: "F. Adams", status: "Paid", tone: "positive" },
];

export default function ResearcherDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [studies, setStudies] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .listStudies()
      .then(setStudies)
      .catch(() => setError("Could not load studies from the server."))
      .finally(() => setLoading(false));
  }, []);

  const liveCount = studies.filter((s) => s.state === "live").length;
  const totalResponsesLabel = studies.length ? String(studies.length) : "0";

  return (
    <DesktopLayout
      eyebrow="RESEARCHER WORKSPACE"
      rightSlot={<Button variant="accent" onClick={() => navigate("/researcher/studies/new")}>New study</Button>}
    >
      <div className="ch-desktop__heading">
        <h1>Good afternoon, {user?.username || "Researcher"}</h1>
      </div>

      <div className="ch-stats-row">
        <StatCard label="LIVE STUDIES" value={String(liveCount)} />
        <StatCard label="TOTAL STUDIES" value={totalResponsesLabel} />
        <StatCard label="UPCOMING SESSIONS" value={String(SESSIONS.length)} />
        <StatCard label="HONORARIA PENDING" value={String(HONORARIA.filter((h) => h.status === "Pending").length)} />
      </div>

      <Card title="Your surveys">
        {loading && <p className="ch-dash-empty">Loading…</p>}
        {error && <p className="ch-dash-empty ch-dash-empty--error">{error}</p>}
        {!loading && !error && studies.length === 0 && (
          <p className="ch-dash-empty">No studies yet — create one to get started.</p>
        )}
        {studies.map((s) => (
          <div className="ch-row" key={s.id}>
            <div>
              <p className="ch-row__title">{s.title}</p>
              <p className="ch-row__meta">
                {s.participant_limit ? `Limit ${s.participant_limit}` : "No participant limit"}
                {s.honorarium ? ` · ${s.honorarium}` : ""}
              </p>
            </div>
            <div className="ch-study-row-actions">
              <Button variant="secondary" onClick={() => navigate(`/researcher/studies/${s.id}/applicants`)}>
                Applicants
              </Button>
              <StatusChip label={s.state} tone={STATE_TONE[s.state] || "neutral"} />
            </div>
          </div>
        ))}
      </Card>

      <div className="ch-lower-row">
        <Card title="Upcoming sessions">
          {SESSIONS.map((sess) => (
            <div className="ch-session-row" key={sess.id}>
              <div className="ch-session-date">
                <span>{sess.day}</span>
                <small>{sess.month}</small>
              </div>
              <div>
                <p className="ch-row__title">{sess.title}</p>
                <p className="ch-row__meta">{sess.meta}</p>
              </div>
            </div>
          ))}
        </Card>

        <Card title="Honorarium tracker">
          {HONORARIA.map((h) => (
            <div className="ch-row" key={h.id}>
              <p className="ch-row__title">{h.name}</p>
              <StatusChip label={h.status} tone={h.tone} />
            </div>
          ))}
        </Card>
      </div>
    </DesktopLayout>
  );
}
