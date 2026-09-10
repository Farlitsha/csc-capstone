import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MobileLayout from "../layouts/MobileLayout";
import Button from "../components/Button";
import Chip from "../components/Chip";
import StatusChip from "../components/StatusChip";
import Icon from "../components/Icon";
import Spinner from "../components/Spinner";
import { api, ApiError } from "../lib/api";
import "./WorkshopsDirectoryPage.css";

export default function WorkshopsDirectoryPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("all");
  const [workshops, setWorkshops] = useState([]);
  const [myRegistrations, setMyRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");

  function loadData() {
    setLoading(true);
    Promise.all([
      api.listWorkshops().catch(() => []),
      api.getMyWorkshopRegistrations().catch(() => []),
    ])
      .then(([wList, myRegs]) => {
        setWorkshops(wList);
        setMyRegistrations(myRegs);
      })
      .catch(() => setError("Could not load workshops."))
      .finally(() => setLoading(false));
  }

  useEffect(loadData, []);

  const registeredWorkshopIds = new Set(myRegistrations.map((r) => r.workshop_id));

  async function handleRegister(workshopId) {
    setActionId(workshopId);
    setError("");
    setFeedback("");
    try {
      await api.registerForWorkshop(workshopId);
      setFeedback("Registered successfully!");
      loadData();
      setTimeout(() => setFeedback(""), 4000);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Could not register for this workshop.");
    } finally {
      setActionId(null);
    }
  }

  async function handleCancelRegistration(workshopId) {
    if (!window.confirm("Cancel your registration for this workshop?")) return;
    setActionId(workshopId);
    setError("");
    setFeedback("");
    try {
      await api.cancelWorkshopRegistration(workshopId);
      setFeedback("Registration cancelled.");
      loadData();
      setTimeout(() => setFeedback(""), 4000);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Could not cancel registration.");
    } finally {
      setActionId(null);
    }
  }

  return (
    <MobileLayout title="Workshops" onBack={() => navigate(-1)}>
      <div className="ch-workshops-page">
        <div className="ch-workshops-tabs" role="group" aria-label="Workshops navigation views">
          <Chip label="Upcoming Workshops" active={tab === "all"} onClick={() => setTab("all")} />
          <Chip
            label={`My Bookings (${myRegistrations.length})`}
            active={tab === "mine"}
            onClick={() => setTab("mine")}
          />
          <Chip
            label={
              <span>
                <Icon name="clipboard" size={13} style={{ marginRight: 4 }} />
                Studies & Surveys
              </span>
            }
            active={false}
            onClick={() => navigate("/studies")}
          />
        </div>

        {/* Screen-reader live region announcing active count */}
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {tab === "all"
            ? (!loading && !error && `${workshops.length} upcoming ${workshops.length === 1 ? "workshop" : "workshops"} scheduled`)
            : (!loading && !error && `${myRegistrations.length} active ${myRegistrations.length === 1 ? "booking" : "bookings"}`)}
        </div>

        {feedback && (
          <div role="status" aria-live="polite" style={{ background: "#d1fae5", border: "1px solid #10b981", color: "#065f46", padding: "10px 14px", borderRadius: "8px", fontSize: "14px" }}>
            {feedback}
          </div>
        )}
        {error && (
          <div role="alert" aria-live="assertive" style={{ background: "#fee2e2", border: "1px solid #ef4444", color: "#991b1b", padding: "10px 14px", borderRadius: "8px", fontSize: "14px" }}>
            {error}
          </div>
        )}

        {loading && <Spinner label="Loading workshops…" />}

        {/* Tab 1: All Upcoming Workshops */}
        {tab === "all" && !loading && (
          <>
            {workshops.length === 0 && (
              <p className="ch-dash-empty">No workshops or interviews scheduled right now.</p>
            )}
            {workshops.map((w) => {
              const isRegistered = registeredWorkshopIds.has(w.id);
              const isFull = (w.registered_count || 0) >= w.max_participants;
              const wDate = new Date(w.date_time);
              const spotsLeft = Math.max(0, w.max_participants - (w.registered_count || 0));

              return (
                <div className="ch-workshops-card" key={w.id}>
                  <div className="ch-workshops-card__head">
                    <div>
                      <h3 className="ch-workshops-card__title">{w.title}</h3>
                      <span className="ch-workshops-card__organizer">
                        Organized by {w.organizer_display_name || w.organizer_username || "Researcher"}
                      </span>
                    </div>
                    {isRegistered && <StatusChip label="Registered" tone="positive" />}
                  </div>

                  <p className="ch-workshops-card__desc">{w.description}</p>

                  <div className="ch-workshops-card__details">
                    <div className="ch-workshops-card__detail-item">
                      <Icon name="calendar" size={14} />
                      <span>{wDate.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} at {wDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                    <div className="ch-workshops-card__detail-item">
                      <Icon name="location" size={14} />
                      <span>{w.location}</span>
                    </div>
                  </div>

                  <div className="ch-workshops-card__actions">
                    <span className={`ch-workshops-spots ${isFull ? "ch-workshops-spots--full" : "ch-workshops-spots--open"}`}>
                      {isFull ? "Fully booked" : `${spotsLeft} of ${w.max_participants} spots remaining`}
                    </span>

                    {isRegistered ? (
                      <Button
                        variant="secondary"
                        className="ch-btn-danger"
                        disabled={actionId === w.id}
                        onClick={() => handleCancelRegistration(w.id)}
                      >
                        {actionId === w.id ? "Cancelling…" : "Cancel booking"}
                      </Button>
                    ) : (
                      <Button
                        variant="accent"
                        disabled={isFull || actionId === w.id}
                        onClick={() => handleRegister(w.id)}
                      >
                        {actionId === w.id ? "Registering…" : isFull ? "Full" : "Register"}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* Tab 2: My Registrations */}
        {tab === "mine" && !loading && (
          <>
            {myRegistrations.length === 0 && (
              <p className="ch-dash-empty">You have not registered for any workshops yet.</p>
            )}
            {myRegistrations.map((reg) => {
              const regDate = new Date(reg.workshop_date_time);
              return (
                <div className="ch-workshops-card" key={reg.id}>
                  <div className="ch-workshops-card__head">
                    <div>
                      <h3 className="ch-workshops-card__title">{reg.workshop_title}</h3>
                      <span className="ch-workshops-card__organizer">
                        Booked on {new Date(reg.registered_at).toLocaleDateString()}
                      </span>
                    </div>
                    <StatusChip label={reg.workshop_status} tone={reg.workshop_status === "scheduled" ? "positive" : "warning"} />
                  </div>

                  <p className="ch-workshops-card__desc">{reg.workshop_description}</p>

                  <div className="ch-workshops-card__details">
                    <div className="ch-workshops-card__detail-item">
                      <Icon name="calendar" size={14} />
                      <span>{regDate.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} at {regDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                    <div className="ch-workshops-card__detail-item">
                      <Icon name="location" size={14} />
                      <span>{reg.workshop_location}</span>
                    </div>
                  </div>

                  <div className="ch-workshops-card__actions" style={{ justifyContent: "flex-end" }}>
                    <Button
                      variant="secondary"
                      className="ch-btn-danger"
                      disabled={actionId === reg.workshop_id}
                      onClick={() => handleCancelRegistration(reg.workshop_id)}
                    >
                      {actionId === reg.workshop_id ? "Cancelling…" : "Cancel booking"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </MobileLayout>
  );
}
