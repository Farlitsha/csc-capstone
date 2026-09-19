import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useLanguage } from "../i18n/LanguageContext";
import MobileLayout from "../layouts/MobileLayout";
import StatusChip from "../components/StatusChip";
import Button from "../components/Button";
import Icon from "../components/Icon";
import GuestAuthModal from "../components/GuestAuthModal";
import ServiceCard from "../components/ServiceCard";
import ReportServiceModal from "../components/ReportServiceModal";
import ServiceRatingModal from "../components/ServiceRatingModal";
import { api } from "../lib/api";
import { useUnreadNotifications } from "../lib/notifications";
import { formatTimeAgo, formatPostedAgo } from "../lib/dateUtils";
import "./CommunityHomePage.css";

export default function CommunityHomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { unreadCount } = useUnreadNotifications(user);
  const [services, setServices] = useState([]);
  const [workshops, setWorkshops] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [censusStats, setCensusStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [guestModalOpen, setGuestModalOpen] = useState(false);
  const [guestModalAction, setGuestModalAction] = useState("");
  const [reportingService, setReportingService] = useState(null);
  const [ratingModalService, setRatingModalService] = useState(null);
  const [revealedPhotos, setRevealedPhotos] = useState([]);
  const [newCount, setNewCount] = useState(0);
  const [lowDataMode] = useState(() => {
    try {
      return localStorage.getItem("commhub_low_data") === "true";
    } catch {
      return false;
    }
  });

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
        const sortedServices = [...otherServices].sort(
          (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0) || (b.id || 0) - (a.id || 0)
        );
        const sortedAnnouncements = [...ann].sort(
          (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0) || (b.id || 0) - (a.id || 0)
        );
        setServices(sortedServices.slice(0, 3));
        setWorkshops(wList.slice(0, 3));
        setAnnouncements(sortedAnnouncements);
        if (cStats) setCensusStats(cStats);
      })
      .finally(() => setLoading(false));
  }, [user]);

  const relevantAnnouncements = announcements.filter((a) => {
    if (!a.audience || a.audience === "All members") return true;
    if ((!user || user?.role === "community_member") && a.audience === "Community Members") return true;
    if (user?.role === "researcher" && a.audience === "Researchers") return true;
    if (user?.role === "admin") return true;
    return false;
  });

  useEffect(() => {
    if (relevantAnnouncements.length === 0) {
      setNewCount(0);
      return;
    }
    const lastSeenId = parseInt(localStorage.getItem("commhub_last_seen_announcement_id") || "0", 10);
    if (lastSeenId > 0) {
      const unread = relevantAnnouncements.filter((a) => a.id > lastSeenId).length;
      setNewCount(unread);
    } else {
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const recent = relevantAnnouncements.filter((a) => new Date(a.created_at).getTime() > sevenDaysAgo).length;
      setNewCount(recent > 0 ? recent : 1);
    }
  }, [relevantAnnouncements]);

  return (
    <MobileLayout>
      <section className="ch-greeting">
        <div className="home-heading-row">
          <h1>{t("home.greeting")}, {user?.username || "Guest"}</h1>

          <Link to="/tutorials" className="home-tutorials-button">
            <Icon name="play" size={18} aria-hidden="true" />
            <span>Tutorials</span>
          </Link>
        </div>
        <p>{t("home.subtitle")}</p>
      </section>

      {!user && (
        <section className="ch-guest-banner-section">
          <div className="ch-guest-banner">
            <div className="ch-guest-banner__head">
              <Icon name="eye" size={16} style={{ color: "#0284c7" }} />
              <span>{t("guest.bannerTitle")}</span>
            </div>
            <p>{t("guest.bannerText")}</p>
            <div className="ch-guest-banner__actions">
              <Link to="/signup" style={{ textDecoration: "none" }}>
                <Button variant="accent" style={{ fontSize: "12px", padding: "6px 14px" }}>
                  {t("guest.createAccount")}
                </Button>
              </Link>
              <Link to="/login" style={{ textDecoration: "none" }}>
                <Button variant="secondary" style={{ fontSize: "12px", padding: "6px 14px" }}>
                  {t("login.button")}
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {relevantAnnouncements.length > 0 && (
        <section className="ch-announcement-section">
          <div
            className="ch-announcement-banner"
            onClick={() => navigate("/announcements")}
            style={{ cursor: "pointer" }}
            role="region"
            aria-label="Platform announcement"
          >
            <div className="ch-announcement-banner__head">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span className="ch-announcement-badge">
                  <Icon name="announcement" size={13} style={{ marginRight: 5 }} />
                  {t("home.announcementsBadge")}
                </span>
                {unreadCount > 0 ? (
                  <span className="ch-announcement-new-badge">
                    {unreadCount === 1 ? (t("announcements.oneNew") || "1 New") : `${unreadCount} ${t("announcements.newCount") || "New"}`}
                  </span>
                ) : (
                  newCount > 0 && (
                    <span className="ch-announcement-new-badge">
                      {newCount === 1 ? (t("announcements.oneNew") || "1 New") : `${newCount} ${t("announcements.newCount") || "New"}`}
                    </span>
                  )
                )}
              </div>
              <Link
                to="/announcements"
                className="ch-announcement-banner__link"
                onClick={(e) => e.stopPropagation()}
              >
                {t("home.viewAll")}
              </Link>
            </div>
            <p>{relevantAnnouncements[0].content}</p>
            <span className="ch-announcement-banner__meta" title={new Date(relevantAnnouncements[0].created_at).toLocaleString()}>
              {t("announcements.broadcastBy")} @{relevantAnnouncements[0].author_username} • {formatPostedAgo(relevantAnnouncements[0].created_at) || new Date(relevantAnnouncements[0].created_at).toLocaleDateString()}
            </span>
          </div>
        </section>
      )}

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
            <ServiceCard
              key={s.id}
              service={s}
              user={user}
              t={t}
              isMine={s.poster_id === user?.id || (user?.username && s.poster_username === user?.username)}
              onReport={(serviceToReport) => setReportingService(serviceToReport)}
              onRate={(serviceToRate) => setRatingModalService(serviceToRate)}
              onRequireAuth={(action) => {
                setGuestModalAction(action);
                setGuestModalOpen(true);
              }}
              lowDataMode={lowDataMode}
              isPhotoRevealed={revealedPhotos.includes(s.id)}
              onRevealPhoto={(id) => setRevealedPhotos((prev) => (prev.includes(id) ? prev : [...prev, id]))}
            />
          ))}
        </div>
      </section>

      {/* Community Insights & Census Card */}
      <section className="ch-insights-card-section">
        <div className="ch-insights-card">
          <div className="ch-insights-card__header">
            <span className="ch-insights-card__badge">
              <Icon name="document" size={13} style={{ marginRight: 5 }} />
              {t("home.censusBadge")}
            </span>
          </div>
          <h3>{t("home.censusTitle")}</h3>
          <p>
            {censusStats && censusStats.total_respondents > 0
              ? `${censusStats.total_respondents} residents surveyed (${censusStats.unemployment_rate}% looking for work). Explore community pie charts & graphs on employment, skills, and income.`
              : t("home.censusDesc")}
          </p>
          <div className="ch-insights-card__actions">
            {user ? (
              <Link to="/community-census">
                <Button variant="accent" style={{ fontSize: "12.5px", padding: "7px 12px" }}>
                  <Icon name="clipboard" size={14} style={{ marginRight: 5 }} />
                  {t("home.takeCensusBtn")}
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
                {t("home.takeCensusBtn")}
              </Button>
            )}
            <Link to="/community-stats">
              <Button variant="secondary" style={{ fontSize: "12.5px", padding: "7px 12px" }}>
                <Icon name="chart" size={14} style={{ marginRight: 5 }} />
                {t("home.viewStatsBtn")}
              </Button>
            </Link>
          </div>
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
                    <p className="ch-event-meta" title={w.created_at ? `Posted: ${new Date(w.created_at).toLocaleString()}` : undefined}>
                      {wDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {w.location}
                      {w.created_at ? ` · Posted ${formatTimeAgo(w.created_at)}` : ""}
                    </p>
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

      <ReportServiceModal
        service={reportingService}
        onClose={() => setReportingService(null)}
      />

      <ServiceRatingModal
        service={ratingModalService}
        isOpen={Boolean(ratingModalService)}
        onClose={() => setRatingModalService(null)}
        onRatingSubmitted={(updatedSvc) => {
          setServices((prev) => prev.map((s) => (s.id === updatedSvc.id ? { ...s, ...updatedSvc } : s)));
          setRatingModalService(null);
        }}
        onOpenGuestModal={(action) => {
          setGuestModalAction(action);
          setGuestModalOpen(true);
        }}
      />
    </MobileLayout>
  );
}
