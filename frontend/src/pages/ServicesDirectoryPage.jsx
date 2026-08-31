import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MobileLayout from "../layouts/MobileLayout";
import StatusChip from "../components/StatusChip";
import Chip from "../components/Chip";
import Button from "../components/Button";
import Icon from "../components/Icon";
import { api, ApiError, API_BASE_URL } from "../lib/api";
import { useLanguage } from "../i18n/LanguageContext";
import "./ServicesDirectoryPage.css";

const CATEGORIES = ["All", "Home repair", "Tutoring", "Food", "Other"];

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
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

export default function ServicesDirectoryPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [applyingId, setApplyingId] = useState(null);
  const [appliedIds, setAppliedIds] = useState([]);

  useEffect(() => {
    setLoading(true);
    api
      .listServices({ category, query })
      .then(setServices)
      .catch(() => setError("Could not load services from the server."))
      .finally(() => setLoading(false));
  }, [category, query]);

  async function handleApply(serviceId) {
    setApplyingId(serviceId);
    try {
      await api.applyToService(serviceId);
      setAppliedIds((ids) => [...ids, serviceId]);
    } catch (err) {
      alert(err instanceof ApiError ? err.detail : "Could not apply to this listing.");
    } finally {
      setApplyingId(null);
    }
  }

  async function handleReport(serviceId) {
    const reason = window.prompt("Why are you reporting this listing? (e.g. scam, offensive, inaccurate info):");
    if (!reason || !reason.trim()) return;
    try {
      await api.reportService(serviceId, reason.trim());
      alert("Thank you. This listing has been flagged for admin review.");
    } catch (err) {
      alert(err instanceof ApiError ? err.detail : "Could not submit report.");
    }
  }

  return (
    <MobileLayout title={t("services.title")} onBack={() => navigate(-1)}>
      <div className="ch-services-search">
        <input
          type="search"
          placeholder={t("services.search")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="ch-services-filters">
        {CATEGORIES.map((c) => (
          <Chip key={c} label={c} active={category === c} onClick={() => setCategory(c)} />
        ))}
      </div>

      <div className="ch-services-post-cta">
        <Button variant="accent" fullWidth onClick={() => navigate("/services/new")}>
          {t("services.postButton")}
        </Button>
      </div>

      <div className="ch-services-list">
        {loading && <p className="ch-services-empty">{t("common.loading")}</p>}
        {error && <p className="ch-services-empty ch-services-empty--error">{error}</p>}
        {!loading && !error && services.length === 0 && <p className="ch-services-empty">{t("services.noResults")}</p>}

        {services.map((s) => (
          <div className="ch-service-full-card" key={s.id}>
            <div className="ch-service-full-card__media">Photo</div>
            <div className="ch-service-card-top">
              <StatusChip
                label={s.type === "request" ? t("services.requested") : t("services.offered")}
                tone={s.type === "request" ? "warning" : "positive"}
              />
              <button
                type="button"
                className="ch-service-report-btn"
                title="Report listing"
                onClick={() => handleReport(s.id)}
              >
                <Icon name="flag" size={12} style={{ marginRight: 4 }} />
                Report
              </button>
            </div>
            <h3>{s.title}</h3>
            <div className="ch-poster-row">
              {avatarSrc(s.poster_avatar_url) ? (
                <img
                  className="ch-poster-avatar"
                  src={avatarSrc(s.poster_avatar_url)}
                  alt={s.poster_display_name || s.poster_username}
                />
              ) : (
                <span className="ch-poster-avatar ch-poster-avatar--initials">
                  {getInitials(s.poster_display_name, s.poster_username)}
                </span>
              )}
              <span className="ch-poster-name">
                {s.poster_display_name || s.poster_username}
              </span>
            </div>
            <p>{s.description}</p>
            <div className="ch-service-full-card__foot">
              <span>{s.price || t("services.priceOnRequest")}</span>
              <Button
                variant="secondary"
                disabled={applyingId === s.id || appliedIds.includes(s.id)}
                onClick={() => handleApply(s.id)}
              >
                {appliedIds.includes(s.id) ? t("services.applied") : applyingId === s.id ? t("services.applying") : t("services.apply")}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </MobileLayout>
  );

}
