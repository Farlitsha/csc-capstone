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

function formatWhatsAppUrl(phone, service) {
  if (!phone) return null;
  let clean = phone.trim().replace(/[^\d+]/g, "");
  if (clean.startsWith("+")) {
    clean = clean.slice(1);
  } else if (clean.startsWith("0")) {
    clean = "27" + clean.slice(1);
  }
  const isOffer = service.type !== "request";
  const posterName = service.poster_display_name || service.poster_username || "";
  const greeting = posterName ? `Hi ${posterName}!` : "Hi!";
  const text = isOffer
    ? `${greeting} I saw your "${service.title}" listing on CommHub and I'm interested in your service. Is it still available?`
    : `${greeting} I saw your request for "${service.title}" on CommHub and I would like to offer my help.`;
  return `https://wa.me/${clean}?text=${encodeURIComponent(text)}`;
}

function formatEmailUrl(email, service) {
  if (!email) return null;
  const isOffer = service.type !== "request";
  const posterName = service.poster_display_name || service.poster_username || "";
  const greeting = posterName ? `Hi ${posterName},` : "Hi,";
  const subject = `CommHub Inquiry: ${service.title}`;
  const body = isOffer
    ? `${greeting}\n\nI saw your listing for "${service.title}" on CommHub and I am interested in your service.\n\nCould you please let me know your availability and pricing details?\n\nThank you!`
    : `${greeting}\n\nI saw your request for "${service.title}" on CommHub and I would like to offer my help.\n\nLooking forward to hearing from you.\n\nThank you!`;
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export default function ServicesDirectoryPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lowDataMode, setLowDataMode] = useState(() => localStorage.getItem("commhub_low_data") === "true");
  const [revealedPhotos, setRevealedPhotos] = useState([]);

  function toggleLowData() {
    setLowDataMode((prev) => {
      const next = !prev;
      localStorage.setItem("commhub_low_data", String(next));
      return next;
    });
  }

  function revealPhoto(id) {
    setRevealedPhotos((prev) => [...prev, id]);
  }

  useEffect(() => {
    setLoading(true);
    api
      .listServices({ category, query })
      .then(setServices)
      .catch(() => setError("Could not load services from the server."))
      .finally(() => setLoading(false));
  }, [category, query]);

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

      <div className="ch-services-toolbar">
        <div className="ch-services-filters">
          {CATEGORIES.map((c) => (
            <Chip key={c} label={c} active={category === c} onClick={() => setCategory(c)} />
          ))}
        </div>
        <button
          type="button"
          className={`ch-low-data-btn ${lowDataMode ? "ch-low-data-btn--active" : ""}`}
          onClick={toggleLowData}
          title="Toggle low data optimization"
        >
          {lowDataMode ? t("services.lowDataOn") : t("services.lowDataOff")}
        </button>
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

        {services.map((s) => {
          const hasImage = Boolean(s.image_url);
          const isPhotoVisible = !lowDataMode || revealedPhotos.includes(s.id);

          return (
            <div className="ch-service-full-card" key={s.id}>
              {hasImage && (
                isPhotoVisible ? (
                  <div className="ch-service-full-card__media ch-service-full-card__media--has-img">
                    <img
                      src={avatarSrc(s.image_url)}
                      alt={s.title}
                      className="ch-service-img"
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <div className="ch-service-full-card__media ch-service-full-card__media--low-data">
                    <span className="ch-low-data-notice">{t("services.photoHidden")}</span>
                    <button
                      type="button"
                      className="ch-load-photo-btn"
                      onClick={() => revealPhoto(s.id)}
                    >
                      {t("services.loadPhoto")}
                    </button>
                  </div>
                )
              )}

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
                <span className="ch-service-price">{s.price || t("services.priceOnRequest")}</span>
                <div className="ch-service-actions">
                  {s.poster_phone ? (
                    <a
                      href={formatWhatsAppUrl(s.poster_phone, s)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ch-contact-btn ch-contact-btn--whatsapp"
                      title={`WhatsApp: ${s.poster_phone}`}
                    >
                      <Icon name="whatsapp" size={15} />
                      <span>{t("services.whatsapp")}</span>
                    </a>
                  ) : (
                    <button
                      type="button"
                      className="ch-contact-btn ch-contact-btn--disabled"
                      title={t("services.noPhoneHint")}
                      onClick={() => alert(t("services.noPhoneHint"))}
                    >
                      <Icon name="whatsapp" size={15} />
                      <span>{t("services.whatsapp")}</span>
                    </button>
                  )}

                  {s.poster_email ? (
                    <a
                      href={formatEmailUrl(s.poster_email, s)}
                      className="ch-contact-btn ch-contact-btn--email"
                      title={`Email: ${s.poster_email}`}
                    >
                      <Icon name="mail" size={15} />
                      <span>{t("services.email")}</span>
                    </a>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </MobileLayout>
  );
}
