import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useLanguage } from "../i18n/LanguageContext";
import MobileLayout from "../layouts/MobileLayout";
import StatCard from "../components/StatCard";
import StatusChip from "../components/StatusChip";
import Button from "../components/Button";
import Icon from "../components/Icon";
import { api } from "../lib/api";
import "./CommunityHomePage.css";

export default function CommunityHomePage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [services, setServices] = useState([]);
  const [servicesCount, setServicesCount] = useState(0);
  const [studiesCount, setStudiesCount] = useState(null);
  const [workshops, setWorkshops] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.listServices().catch(() => []),
      api.listStudies().catch(() => []),
      api.listWorkshops().catch(() => []),
      api.listAnnouncements().catch(() => []),
    ])
      .then(([svc, studies, wList, ann]) => {
        setServices(svc.slice(0, 2));
        setServicesCount(svc.length);
        setStudiesCount(studies.length);
        setWorkshops(wList.slice(0, 3));
        setAnnouncements(ann);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <MobileLayout>
      <section className="ch-greeting">
        <h1>{t("home.greeting")}, {user?.username || "there"}</h1>
        <p>{t("home.subtitle")}</p>
      </section>

      {announcements.length > 0 && (
        <section className="ch-announcement-section">
          <div className="ch-announcement-banner">
            <div className="ch-announcement-banner__head">
              <span className="ch-announcement-badge">
                <Icon name="announcement" size={13} style={{ marginRight: 5 }} />
                Announcement
              </span>
              <Link to="/messages" className="ch-announcement-banner__link">
                View all
              </Link>
            </div>
            <p>{announcements[0].content}</p>
            <span className="ch-announcement-banner__meta">
              Posted by @{announcements[0].author_username} • {new Date(announcements[0].created_at).toLocaleDateString()}
            </span>
          </div>
        </section>
      )}



      <section className="ch-stats-row-mobile">
        <StatCard label={t("home.openServices")} value={loading ? "…" : String(servicesCount)} />
        <Link to="/studies" className="ch-stat-link">
          <StatCard label={t("home.activeStudies")} value={loading ? "…" : String(studiesCount ?? 0)} />
        </Link>
      </section>

      <section className="ch-section">
        <div className="ch-section__head">
          <h2>{t("home.servicesNearYou")}</h2>
          <Link to="/services">{t("home.seeAll")}</Link>
        </div>

        {!loading && services.length === 0 && (
          <div className="ch-empty-cta">
            <p>{t("home.noServices")}</p>
            <Link to="/services/new">
              <Button variant="accent">{t("home.postFirst")}</Button>
            </Link>
          </div>
        )}

        <div className="ch-service-list">
          {services.map((s) => (
            <div className="ch-service-card" key={s.id}>
              <StatusChip
                label={s.type === "request" ? t("services.requested") : t("services.offered")}
                tone={s.type === "request" ? "warning" : "positive"}
              />
              <h3>{s.title}</h3>
              <p>{s.description}</p>
              <span className="ch-service-card__price">{s.price || t("services.priceOnRequest")}</span>
            </div>
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
    </MobileLayout>
  );
}
