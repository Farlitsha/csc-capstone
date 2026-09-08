import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useLanguage } from "../i18n/LanguageContext";
import MobileLayout from "../layouts/MobileLayout";
import StatusChip from "../components/StatusChip";
import Button from "../components/Button";
import Icon from "../components/Icon";
import GuestAuthModal from "../components/GuestAuthModal";
import { api } from "../lib/api";
import "./CommunityHomePage.css";

export default function CommunityHomePage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [services, setServices] = useState([]);
  const [workshops, setWorkshops] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [censusStats, setCensusStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [guestModalOpen, setGuestModalOpen] = useState(false);
  const [guestModalAction, setGuestModalAction] = useState("");

  useEffect(() => {
    Promise.all([
      api.listServices().catch(() => []),
      api.listWorkshops().catch(() => []),
      api.listAnnouncements().catch(() => []),
      api.getCensusStats().catch(() => null),
    ])
      .then(([svc, wList, ann, cStats]) => {
        const isOwn = (s) => s.poster_id === user?.id || (user?.username && s.poster_username === user?.username);
        const otherServices = svc.filter((s) => !isOwn(s));
        setServices(otherServices.slice(0, 3));
        setWorkshops(wList.slice(0, 3));
        setAnnouncements(ann);
        if (cStats) setCensusStats(cStats);
      })
      .finally(() => setLoading(false));
  }, [user]);



  const relevantAnnouncements = announcements.filter((a) => {
    if (!a.audience || a.audience === "All members") return true;
    if (user?.role === "researcher" && a.audience === "Researchers") return true;
    if (user?.role === "admin") return true;
    return false;
  });

  return (
    <MobileLayout>
      <section className="ch-greeting">
        <h1>{t("home.greeting")}, {user?.username || "Guest"}</h1>
        <p>{t("home.subtitle")}</p>
      </section>

      {!user && (
        <section className="ch-guest-banner-section" style={{ margin: "0 0 16px 0" }}>
          <div style={{
            background: "linear-gradient(135deg, #f0fdfa 0%, #e0f2fe 100%)",
            border: "1px solid #bae6fd",
            borderRadius: "12px",
            padding: "14px 16px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Icon name="eye" size={16} style={{ color: "#0284c7" }} />
              <span style={{ fontWeight: 600, fontSize: "14px", color: "#0369a1" }}>
                Browsing as Guest
              </span>
            </div>
            <p style={{ margin: 0, fontSize: "13px", lineHeight: "1.45", color: "#334155" }}>
              You are exploring CommHub without an account. You can browse services, studies, and workshops freely. To post listings, apply to studies, or join workshops, create a free account.
            </p>
            <div style={{ display: "flex", gap: "8px", marginTop: "2px" }}>
              <Link to="/signup" style={{ textDecoration: "none" }}>
                <Button variant="accent" style={{ fontSize: "12px", padding: "6px 14px" }}>
                  Create Free Account
                </Button>
              </Link>
              <Link to="/login" style={{ textDecoration: "none" }}>
                <Button variant="secondary" style={{ fontSize: "12px", padding: "6px 14px" }}>
                  Log In
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {relevantAnnouncements.length > 0 && (
        <section className="ch-announcement-section">
          <div className="ch-announcement-banner">
            <div className="ch-announcement-banner__head">
              <span className="ch-announcement-badge">
                <Icon name="announcement" size={13} style={{ marginRight: 5 }} />
                Announcement
              </span>
              <Link to="/announcements" className="ch-announcement-banner__link">
                View all ({relevantAnnouncements.length})
              </Link>
            </div>
            <p>{relevantAnnouncements[0].content}</p>
            <span className="ch-announcement-banner__meta">
              Broadcast by @{relevantAnnouncements[0].author_username} • {new Date(relevantAnnouncements[0].created_at).toLocaleDateString()}
            </span>
          </div>
        </section>
      )}

      {/* Community Insights & Census Card */}
      <section className="ch-insights-card-section">
        <div className="ch-insights-card">
          <div className="ch-insights-card__header">
            <span className="ch-insights-card__badge">
              <Icon name="document" size={13} style={{ marginRight: 5 }} />
              Community Census & Stats
            </span>
            <Link to="/community-stats" className="ch-insights-card__link">
              View charts →
            </Link>
          </div>
          <h3>Local Job Market & Poverty Insights</h3>
          <p>
            {censusStats && censusStats.total_respondents > 0
              ? `${censusStats.total_respondents} residents surveyed (${censusStats.unemployment_rate}% looking for work). Explore community pie charts & graphs on employment, skills, and income.`
              : "Share demographic input to help Ocean View identify employment trends, job skills, and poverty rates."}
          </p>
          <div className="ch-insights-card__actions">
            {user ? (
              <Link to="/community-census">
                <Button variant="accent" style={{ fontSize: "12.5px", padding: "7px 12px" }}>
                  <Icon name="clipboard" size={14} style={{ marginRight: 5 }} />
                  Take Census Survey
                </Button>
              </Link>
            ) : (
              <Button
                variant="accent"
                style={{ fontSize: "12.5px", padding: "7px 12px" }}
                onClick={() => {
                  setGuestModalAction("take the census survey");
                  setGuestModalOpen(true);
                }}
              >
                <Icon name="clipboard" size={14} style={{ marginRight: 5 }} />
                Take Census Survey
              </Button>
            )}
            <Link to="/community-stats">
              <Button variant="secondary" style={{ fontSize: "12.5px", padding: "7px 12px" }}>
                <Icon name="chart" size={14} style={{ marginRight: 5 }} />
                View Graphs & Charts
              </Button>
            </Link>
          </div>

        </div>
      </section>


      <section className="ch-section">
        <div className="ch-section__head">
          <h2>{t("home.servicesNearYou")}</h2>
          <Link to="/services">{t("home.seeAll")}</Link>
        </div>

        {!loading && services.length === 0 && (
          <div className="ch-empty-cta">
            <p>{t("home.noServices")}</p>
            {user ? (
              <Link to="/services/new">
                <Button variant="accent">{t("home.postFirst")}</Button>
              </Link>
            ) : (
              <Button
                variant="accent"
                onClick={() => {
                  setGuestModalAction("post a service or request");
                  setGuestModalOpen(true);
                }}
              >
                {t("home.postFirst")}
              </Button>
            )}
          </div>
        )}

        <div className="ch-service-list">
          {services.map((s) => (
            <Link to="/services" key={s.id} style={{ textDecoration: "none", color: "inherit" }}>
              <div className="ch-service-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <StatusChip
                    label={s.type === "request" ? t("services.requested") : t("services.offered")}
                    tone={s.type === "request" ? "warning" : "positive"}
                  />
                  <span style={{ fontSize: "12px", color: "var(--color-sage)" }}>
                    By @{s.poster_username}
                  </span>
                </div>
                <h3>{s.title}</h3>
                <p>{s.description}</p>
                <span className="ch-service-card__price">{s.price || t("services.priceOnRequest")}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>


      <section className="ch-section">
        <div className="ch-section__head">
          <h2>{t("home.upcoming") || "Upcoming workshops & events"}</h2>
          <Link to="/workshops">{t("home.seeAll") || "See all"}</Link>
        </div>
        <div className="ch-event-list">
          {workshops.length === 0 && !loading && (
            <p style={{ color: "#6b7280", fontSize: "14px", padding: "8px 0" }}>No upcoming workshops scheduled at the moment.</p>
          )}
          {workshops.map((w) => {
            const wDate = new Date(w.date_time);
            const day = wDate.getDate().toString().padStart(2, "0");
            const month = wDate.toLocaleString("default", { month: "short" }).toUpperCase();
            return (
              <Link to="/workshops" key={w.id} style={{ textDecoration: "none", color: "inherit" }}>
                <div className="ch-event-row">
                  <div className="ch-event-date">
                    <span>{day}</span>
                    <small>{month}</small>
                  </div>
                  <div>
                    <p className="ch-event-title">{w.title}</p>
                    <p className="ch-event-meta">{wDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {w.location}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <GuestAuthModal
        isOpen={guestModalOpen}
        onClose={() => setGuestModalOpen(false)}
        actionName={guestModalAction}
      />
    </MobileLayout>
  );
}
