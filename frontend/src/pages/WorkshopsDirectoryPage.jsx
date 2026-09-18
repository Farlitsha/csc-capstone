import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MobileLayout from "../layouts/MobileLayout";
import Button from "../components/Button";
import Chip from "../components/Chip";
import StatusChip from "../components/StatusChip";
import Icon from "../components/Icon";
import Spinner from "../components/Spinner";
import { useAuth } from "../auth/AuthContext";
import { useLanguage } from "../i18n/LanguageContext";
import GuestAuthModal from "../components/GuestAuthModal";
import ConfirmModal from "../components/ConfirmModal";
import { api, ApiError } from "../lib/api";
import "./WorkshopsDirectoryPage.css";

export default function WorkshopsDirectoryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [tab, setTab] = useState("all");
  const [workshops, setWorkshops] = useState([]);
  const [myRegistrations, setMyRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [guestModalOpen, setGuestModalOpen] = useState(false);
  const [guestModalAction, setGuestModalAction] = useState("");

  function loadData() {
    setLoading(true);
    const promises = [
      api.listWorkshops().catch(() => []),
      user ? api.getMyWorkshopRegistrations().catch(() => []) : Promise.resolve([]),
    ];
    Promise.all(promises)
      .then(([wList, myRegs]) => {
        setWorkshops(wList);
        setMyRegistrations(myRegs);
      })
      .catch(() => setError("Could not load workshops."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadData();
  }, [user]);

  const registeredWorkshopIds = new Set(myRegistrations.map((r) => r.workshop_id));

  async function handleRegister(workshopId) {
    if (!user) {
      setGuestModalAction("register for workshops");
      setGuestModalOpen(true);
      return;
    }
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

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancellingWorkshopId, setCancellingWorkshopId] = useState(null);

  function handleCancelRegistration(workshopId) {
    setCancellingWorkshopId(workshopId);
    setCancelModalOpen(true);
  }

  async function performCancelRegistration() {
    if (!cancellingWorkshopId) return;
    const workshopId = cancellingWorkshopId;
    setCancelModalOpen(false);
    setActionId(workshopId);
    setError("");
    setFeedback("");
    try {
      await api.cancelWorkshopRegistration(workshopId);
      setFeedback(t("workshops.cancelledFeedback"));
      loadData();
      setTimeout(() => setFeedback(""), 4000);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Could not cancel registration.");
    } finally {
      setActionId(null);
      setCancellingWorkshopId(null);
    }
  }


  return (
    <MobileLayout title={t("workshops.title")} onBack={() => navigate(-1)}>
      {/* Top Main Tabs: Upcoming vs My Bookings vs Studies */}
      <div className="ch-service-tabs-row" role="tablist" aria-label="Workshops navigation views">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "all"}
          className={`ch-service-tab-btn ${tab === "all" ? "ch-service-tab-btn--active" : ""}`}
          onClick={() => setTab("all")}
        >
          <Icon name="calendar" size={14} style={{ marginRight: 6 }} />
          {t("workshops.upcomingTab")} ({workshops.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "mine"}
          className={`ch-service-tab-btn ${tab === "mine" ? "ch-service-tab-btn--active" : ""}`}
          onClick={() => setTab("mine")}
        >
          <Icon name="user-check" size={14} style={{ marginRight: 6 }} />
          {t("workshops.myBookingsTab")} ({myRegistrations.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={false}
          className="ch-service-tab-btn"
          onClick={() => navigate("/studies")}
        >
          <Icon name="clipboard" size={14} style={{ marginRight: 6 }} />
          {t("workshops.studiesTab")}
        </button>
      </div>

      <div className="ch-workshops-page">

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

        {loading && <Spinner label={t("workshops.loading")} />}

        {/* Tab 1: All Upcoming Workshops */}
        {tab === "all" && !loading && (
          <>
            {workshops.length === 0 && (
              <p className="ch-dash-empty">{t("workshops.noWorkshops")}</p>
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
                        {t("workshops.organizedBy")} {w.organizer_display_name || w.organizer_username || "Researcher"}
                      </span>
                    </div>
                    {isRegistered && <StatusChip label={t("workshops.registered")} tone="positive" />}
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
                      {isFull ? t("workshops.fullyBooked") : `${spotsLeft} ${t("workshops.of")} ${w.max_participants} ${t("workshops.spotsRemaining")}`}
                    </span>

                    {isRegistered ? (
                      <Button
                        variant="secondary"
                        className="ch-btn-danger"
                        disabled={actionId === w.id}
                        onClick={() => handleCancelRegistration(w.id)}
                      >
                        {actionId === w.id ? t("workshops.cancelling") : t("workshops.cancelBooking")}
                      </Button>
                    ) : (
                      <Button
                        variant="accent"
                        disabled={isFull || actionId === w.id}
                        onClick={() => handleRegister(w.id)}
                      >
                        {actionId === w.id ? t("workshops.registering") : isFull ? t("workshops.full") : t("workshops.register")}
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
            {!user ? (
              <div style={{ textAlign: "center", padding: "32px 16px" }}>
                <p style={{ color: "var(--color-sage)", fontSize: "14px", marginBottom: "14px" }}>
                  {t("workshops.guestNotice")}
                </p>
                <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                  <Button variant="accent" onClick={() => navigate("/signup")}>
                    {t("common.createFreeAccount")}
                  </Button>
                  <Button variant="secondary" onClick={() => navigate("/login")}>
                    {t("login.button")}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {myRegistrations.length === 0 && (
                  <p className="ch-dash-empty">{t("workshops.noBookings")}</p>
                )}
                {myRegistrations.map((reg) => {
                  const regDate = new Date(reg.workshop_date_time);
                  return (
                    <div className="ch-workshops-card" key={reg.id}>
                      <div className="ch-workshops-card__head">
                        <div>
                          <h3 className="ch-workshops-card__title">{reg.workshop_title}</h3>
                          <span className="ch-workshops-card__organizer">
                            {t("workshops.bookedOn")} {new Date(reg.registered_at).toLocaleDateString()}
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
                          {actionId === reg.workshop_id ? t("workshops.cancelling") : t("workshops.cancelBooking")}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </>
        )}
      </div>

      <GuestAuthModal
        isOpen={guestModalOpen}
        onClose={() => setGuestModalOpen(false)}
        actionName={guestModalAction}
      />

      <ConfirmModal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        onConfirm={performCancelRegistration}
        title={t("workshops.cancelBooking") || "Cancel Booking"}
        message={t("workshops.cancelConfirm") || "Are you sure you want to cancel your registration for this workshop?"}
        confirmText={t("workshops.cancelBooking") || "Yes, Cancel Booking"}
        cancelText={t("common.cancel") || "Keep Booking"}
        variant="danger"
        icon="calendar"
      />
    </MobileLayout>
  );
}

