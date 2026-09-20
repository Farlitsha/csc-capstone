import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MobileLayout from "../layouts/MobileLayout";
import Button from "../components/Button";
import StatusChip from "../components/StatusChip";
import Icon from "../components/Icon";
import Spinner from "../components/Spinner";
import { useAuth } from "../auth/AuthContext";
import { useLanguage } from "../i18n/LanguageContext";
import GuestAuthModal from "../components/GuestAuthModal";
import ConfirmModal from "../components/ConfirmModal";
import { api, ApiError, API_BASE_URL } from "../lib/api";
import { useCacheSync } from "../lib/cache";
import { formatPostedAgo } from "../lib/dateUtils";
import "./WorkshopsDirectoryPage.css";

function avatarSrc(url) {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return `${API_BASE_URL}${url}`;
}

function getInitials(displayName, username) {
  const name = displayName || username || "";
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "W"
  );
}

export default function WorkshopsDirectoryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const [tab, setTab] = useState("all");
  const [query, setQuery] = useState("");

  // Instant render from local cache if available
  const [workshops, setWorkshops] = useState(() => api.getCached("/workshops/") || []);
  const [myRegistrations, setMyRegistrations] = useState(() => (user ? api.getCached("/workshops/me/registrations") || [] : []));
  const [loading, setLoading] = useState(() => workshops.length === 0);
  const [actionId, setActionId] = useState(null);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [guestModalOpen, setGuestModalOpen] = useState(false);
  const [guestModalAction, setGuestModalAction] = useState("");

  function loadData(showSpinner = false) {
    if (showSpinner) setLoading(true);
    const promises = [
      api.listWorkshops().catch(() => []),
      user ? api.getMyWorkshopRegistrations().catch(() => []) : Promise.resolve([]),
    ];
    Promise.all(promises)
      .then(([wList, myRegs]) => {
        setWorkshops(wList || []);
        setMyRegistrations(myRegs || []);
        setError("");
      })
      .catch(() => setError(t("workshops.loadError") || "Could not load workshops."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadData(workshops.length === 0);
  }, [user]);

  // Real-time responsiveness: when any workshop is registered, created, or cancelled
  useCacheSync("^/workshops", () => {
    loadData(false);
  });

  const registeredWorkshopIds = new Set(myRegistrations.map((r) => r.workshop_id));

  // Workshops that the logged-in member has not registered for yet
  const openWorkshops = user
    ? workshops.filter((w) => !registeredWorkshopIds.has(w.id))
    : workshops;

  // Filtered by search query
  const filteredWorkshops = openWorkshops.filter((w) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      (w.title && w.title.toLowerCase().includes(q)) ||
      (w.description && w.description.toLowerCase().includes(q)) ||
      (w.location && w.location.toLowerCase().includes(q)) ||
      (w.organizer_display_name && w.organizer_display_name.toLowerCase().includes(q))
    );
  });

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
      const res = await api.registerForWorkshop(workshopId);
      setFeedback("Registered successfully!");
      const target = workshops.find((w) => w.id === workshopId);
      if (target) {
        setMyRegistrations((prev) => [
          ...prev,
          {
            id: res?.id || Date.now(),
            workshop_id: workshopId,
            registered_at: new Date().toISOString(),
            workshop_title: target.title,
            workshop_description: target.description,
            workshop_location: target.location,
            workshop_date_time: target.date_time,
            workshop_status: target.status,
            organizer_display_name: target.organizer_display_name,
            organizer_username: target.organizer_username,
          },
        ]);
      }
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
      setFeedback(t("workshops.cancelledFeedback") || "Registration cancelled successfully.");
      setMyRegistrations((prev) => prev.filter((r) => r.workshop_id !== workshopId));
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
    <MobileLayout title={t("workshops.title") || "Community Workshops"} onBack={() => navigate(-1)}>
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
          {t("workshops.upcomingTab") || "Upcoming Workshops"} ({openWorkshops.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "mine"}
          className={`ch-service-tab-btn ${tab === "mine" ? "ch-service-tab-btn--active" : ""}`}
          onClick={() => setTab("mine")}
        >
          <Icon name="user-check" size={14} style={{ marginRight: 6 }} />
          {t("workshops.myBookingsTab") || "My Bookings"} ({user ? myRegistrations.length : 0})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={false}
          className="ch-service-tab-btn"
          onClick={() => navigate("/studies")}
        >
          <Icon name="clipboard" size={14} style={{ marginRight: 6 }} />
          {t("workshops.studiesTab") || "Studies"}
        </button>
      </div>

      {/* Search Input for Workshops */}
      {tab === "all" && (
        <div className="ch-workshops-search">
          <input
            type="search"
            placeholder={t("workshops.search") || "Search workshops by topic or location…"}
            aria-label="Search workshops"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      )}

      {/* Screen-reader live region announcing active count */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {tab === "all"
          ? (!loading && !error && `${filteredWorkshops.length} upcoming workshop${filteredWorkshops.length === 1 ? "" : "s"} scheduled`)
          : (!loading && !error && `${myRegistrations.length} active booking${myRegistrations.length === 1 ? "" : "s"}`)}
      </div>

      {/* Feedback / Alert banners */}
      {feedback && (
        <div className="ch-workshops-feedback ch-workshops-feedback--success" role="status" aria-live="polite">
          {feedback}
        </div>
      )}
      {error && (
        <div className="ch-workshops-feedback ch-workshops-feedback--error" role="alert" aria-live="assertive">
          {error}
        </div>
      )}

      <div className="ch-workshops-list">
        {loading && <Spinner label={t("workshops.loading") || "Loading workshops…"} />}

        {/* Tab 1: All Upcoming Workshops */}
        {tab === "all" && !loading && (
          <>
            {filteredWorkshops.length === 0 && (
              <div className="ch-workshops-empty">
                {query
                  ? `No upcoming workshops match "${query}".`
                  : t("workshops.noWorkshops") || "No upcoming community workshops scheduled at this time."}
              </div>
            )}

            {filteredWorkshops.map((w) => {
              const isFull = (w.registered_count || 0) >= w.max_participants;
              const wDate = new Date(w.date_time);
              const spotsLeft = Math.max(0, w.max_participants - (w.registered_count || 0));

              return (
                <div className="ch-workshop-card" key={w.id}>
                  <div className="ch-workshop-card__header-row">
                    <StatusChip
                      label={isFull ? (t("workshops.fullyBooked") || "Fully Booked") : (w.status || "Scheduled")}
                      tone={isFull ? "warning" : "positive"}
                    />
                    {w.created_at && (
                      <span className="ch-workshop-card__header-date" title={new Date(w.created_at).toLocaleString()}>
                        {formatPostedAgo(w.created_at, lang, "Posted")}
                      </span>
                    )}
                  </div>

                  <h3>{w.title}</h3>

                  <div className="ch-poster-row">
                    {avatarSrc(w.organizer_avatar_url) ? (
                      <img
                        className="ch-poster-avatar"
                        src={avatarSrc(w.organizer_avatar_url)}
                        alt={w.organizer_display_name || w.organizer_username}
                      />
                    ) : (
                      <span className="ch-poster-avatar--initials">
                        {getInitials(w.organizer_display_name, w.organizer_username)}
                      </span>
                    )}
                    <span className="ch-poster-name">
                      {w.organizer_display_name || w.organizer_username || "Researcher"}
                    </span>
                  </div>

                  <p>{w.description}</p>

                  <div className="ch-workshop-card__meta">
                    <span>
                      <Icon name="calendar" size={12} style={{ marginRight: 3 }} />
                      {wDate.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} at{" "}
                      {wDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <span>
                      <Icon name="location" size={12} style={{ marginRight: 3 }} />
                      {w.location}
                    </span>
                  </div>

                  <div className="ch-workshop-card__actions">
                    <span
                      className={`ch-workshop-spots-badge ${
                        isFull ? "ch-workshop-spots-badge--full" : "ch-workshop-spots-badge--open"
                      }`}
                    >
                      {isFull
                        ? t("workshops.fullyBooked") || "Fully Booked"
                        : `${spotsLeft} of ${w.max_participants} spots left`}
                    </span>

                    <Button
                      variant="accent"
                      disabled={isFull || actionId === w.id}
                      onClick={() => handleRegister(w.id)}
                    >
                      {actionId === w.id
                        ? t("workshops.registering") || "Booking…"
                        : isFull
                        ? t("workshops.full") || "Full"
                        : t("workshops.register") || "Register"}
                    </Button>
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
              <div className="ch-workshops-empty">
                <p style={{ color: "var(--color-sage)", fontSize: "14px", margin: "0 0 14px" }}>
                  {t("workshops.guestNotice") ||
                    "You are browsing as a guest. Create an account or log in to manage your workshop bookings."}
                </p>
                <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                  <Button variant="accent" onClick={() => navigate("/signup")}>
                    {t("common.createFreeAccount") || "Create Free Account"}
                  </Button>
                  <Button variant="secondary" onClick={() => navigate("/login")}>
                    {t("login.button") || "Log In"}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {myRegistrations.length === 0 && (
                  <div className="ch-workshops-empty">
                    <p style={{ margin: "0 0 12px" }}>
                      {t("workshops.noBookings") || "You have not registered for any upcoming workshops yet."}
                    </p>
                    <Button variant="secondary" onClick={() => setTab("all")}>
                      Browse Upcoming Workshops →
                    </Button>
                  </div>
                )}

                {myRegistrations.map((reg) => {
                  const regDate = new Date(reg.workshop_date_time);
                  return (
                    <div className="ch-workshop-card" key={reg.id}>
                      <div className="ch-workshop-card__header-row">
                        <StatusChip
                          label={reg.workshop_status || "Registered"}
                          tone={reg.workshop_status === "scheduled" ? "positive" : "warning"}
                        />
                        <span className="ch-workshop-card__header-date">
                          {t("workshops.bookedOn") || "Booked on"}{" "}
                          {new Date(reg.registered_at).toLocaleDateString()}
                        </span>
                      </div>

                      <h3>{reg.workshop_title}</h3>

                      <div className="ch-poster-row">
                        <span className="ch-poster-avatar--initials">
                          {getInitials(reg.organizer_display_name, reg.organizer_username)}
                        </span>
                        <span className="ch-poster-name">
                          {reg.organizer_display_name || reg.organizer_username || "Researcher"}
                        </span>
                      </div>

                      <p>{reg.workshop_description}</p>

                      <div className="ch-workshop-card__meta">
                        <span>
                          <Icon name="calendar" size={12} style={{ marginRight: 3 }} />
                          {regDate.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} at{" "}
                          {regDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <span>
                          <Icon name="location" size={12} style={{ marginRight: 3 }} />
                          {reg.workshop_location}
                        </span>
                      </div>

                      <div className="ch-workshop-card__actions" style={{ justifyContent: "flex-end" }}>
                        <Button
                          variant="secondary"
                          className="ch-btn-danger"
                          disabled={actionId === reg.workshop_id}
                          onClick={() => handleCancelRegistration(reg.workshop_id)}
                        >
                          {actionId === reg.workshop_id
                            ? t("workshops.cancelling") || "Cancelling…"
                            : t("workshops.cancelBooking") || "Cancel Booking"}
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
