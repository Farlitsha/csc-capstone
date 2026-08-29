import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useLanguage } from "../i18n/LanguageContext";
import MobileLayout from "../layouts/MobileLayout";
import StatCard from "../components/StatCard";
import StatusChip from "../components/StatusChip";
import Button from "../components/Button";
import { api } from "../lib/api";
import "./CommunityHomePage.css";

// Booked/upcoming events aren't backed by an endpoint yet - illustrative content
// matching the Figma sample data. Services below ARE real (see backend/app/routers/services.py).
const UPCOMING = [
  { id: 1, day: "05", month: "AUG", title: "Research interview", meta: "2:00pm · iNethi Research Team" },
  { id: 2, day: "09", month: "AUG", title: "Feedback workshop", meta: "10:00am · Community Hall" },
];

export default function CommunityHomePage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [services, setServices] = useState([]);
  const [servicesCount, setServicesCount] = useState(0);
  const [studiesCount, setStudiesCount] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.listServices(), api.listStudies().catch(() => [])])
      .then(([svc, studies]) => {
        setServices(svc.slice(0, 2));
        setServicesCount(svc.length);
        setStudiesCount(studies.length);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <MobileLayout>
      <section className="ch-greeting">
        <h1>{t("home.greeting")}, {user?.username || "there"}</h1>
        <p>{t("home.subtitle")}</p>
      </section>

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
        <h2>{t("home.upcoming")}</h2>
        <div className="ch-event-list">
          {UPCOMING.map((e) => (
            <div className="ch-event-row" key={e.id}>
              <div className="ch-event-date">
                <span>{e.day}</span>
                <small>{e.month}</small>
              </div>
              <div>
                <p className="ch-event-title">{e.title}</p>
                <p className="ch-event-meta">{e.meta}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </MobileLayout>
  );
}
