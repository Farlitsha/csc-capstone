import { useState } from "react";
import StatusChip from "./StatusChip";
import Icon from "./Icon";
import { formatPostedAgo } from "../lib/dateUtils";
import { API_BASE_URL } from "../lib/api";
import "./ServiceCard.css";

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
      .join("") || "U"
  );
}

function formatWhatsAppUrl(phone, service) {
  if (!phone) return null;
  const digits = phone.replace(/[^0-9]/g, "");
  let intlDigits = digits;
  if (digits.startsWith("0") && digits.length === 10) {
    intlDigits = `27${digits.slice(1)}`;
  } else if (!digits.startsWith("27") && digits.length === 9) {
    intlDigits = `27${digits}`;
  }
  const text = encodeURIComponent(
    `Hello, I saw your "${service.title}" listing on CommHub and would like to connect.`
  );
  return `https://wa.me/${intlDigits}?text=${text}`;
}

function formatEmailUrl(email, service) {
  if (!email) return null;
  const subject = encodeURIComponent(`CommHub inquiry: ${service.title}`);
  const body = encodeURIComponent(
    `Hello,\n\nI saw your listing for "${service.title}" on CommHub and would like to know more.\n\nThank you!`
  );
  return `mailto:${email}?subject=${subject}&body=${body}`;
}

export default function ServiceCard({
  service,
  user,
  t,
  isMine = false,
  onEdit,
  onDelete,
  onReport,
  onRequireAuth,
  lowDataMode = false,
  isPhotoRevealed = false,
  onRevealPhoto,
}) {
  const [localRevealed, setLocalRevealed] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const photoVisible = !lowDataMode || isPhotoRevealed || localRevealed;
  const hasImage = Boolean(service.image_url);
  const isLongDescription = Boolean(
    service.description && (service.description.length > 180 || (service.description.match(/\n/g) || []).length >= 3)
  );

  function handleReveal() {
    setLocalRevealed(true);
    if (onRevealPhoto) onRevealPhoto(service.id);
  }

  const requestedLabel = t ? t("services.requested") : "Requesting";
  const offeredLabel = t ? t("services.offered") : "Offering";
  const priceLabel = service.price || (t ? t("services.priceOnRequest") : "Price on request");
  const whatsappLabel = t ? t("services.whatsapp") : "WhatsApp";
  const emailLabel = t ? t("services.email") : "Email";
  const noPhoneHint = t
    ? t("services.noPhoneHint")
    : "This poster has not provided a phone number. Please contact them via Email.";

  return (
    <div className={`ch-service-full-card ${isMine ? "ch-service-full-card--mine" : ""}`} key={service.id}>
      <div className="ch-service-card-top">
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <StatusChip
            label={service.type === "request" ? requestedLabel : offeredLabel}
            tone={service.type === "request" ? "warning" : "positive"}
            icon=""
          />
          {isMine && (
            <span className="ch-own-badge">
              Your Post
            </span>
          )}
        </div>

        {isMine ? (
          <div className="ch-own-actions">
            {onEdit && (
              <button
                type="button"
                className="ch-edit-action-btn"
                title="Edit this listing"
                onClick={() => onEdit(service)}
              >
                <Icon name="edit" size={13} style={{ marginRight: 4 }} />
                Edit
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                className="ch-delete-action-btn"
                title="Delete this listing"
                onClick={() => onDelete(service)}
              >
                Delete
              </button>
            )}
          </div>
        ) : (
          <button
            type="button"
            className="ch-service-report-btn"
            title="Report listing"
            onClick={() => {
              if (!user) {
                if (onRequireAuth) {
                  onRequireAuth("report a service listing");
                }
              } else {
                if (onReport) onReport(service);
              }
            }}
          >
            <Icon name="flag" size={12} style={{ marginRight: 4 }} />
            Report
          </button>
        )}
      </div>

      <h3>{service.title}</h3>
      <div className="ch-poster-row">
        {avatarSrc(service.poster_avatar_url) ? (
          <img
            className="ch-poster-avatar"
            src={avatarSrc(service.poster_avatar_url)}
            alt={service.poster_display_name || service.poster_username}
          />
        ) : (
          <span className="ch-poster-avatar ch-poster-avatar--initials">
            {getInitials(service.poster_display_name, service.poster_username)}
          </span>
        )}
        <span className="ch-poster-name">
          {isMine
            ? `${service.poster_display_name || service.poster_username} (You)`
            : (service.poster_display_name || service.poster_username)}
        </span>
        {service.created_at && (
          <span className="ch-card-time-ago" title={new Date(service.created_at).toLocaleString()}>
            • {formatPostedAgo(service.created_at)}
          </span>
        )}
      </div>

      <div className="ch-service-body">
        <p className={`ch-service-desc ${isLongDescription && !descExpanded ? "ch-service-desc--clamped" : ""}`}>
          {service.description}
        </p>

        {isLongDescription && (
          <button
            type="button"
            className="ch-service-desc-toggle"
            onClick={() => setDescExpanded((prev) => !prev)}
            aria-expanded={descExpanded}
          >
            {descExpanded
              ? (t ? t("common.readLess") : "Read less")
              : (t ? t("common.readMore") : "...Read more")}
          </button>
        )}

        {hasImage && (
          photoVisible ? (
            <div className="ch-service-full-card__media ch-service-full-card__media--has-img">
              <img
                src={avatarSrc(service.image_url)}
                alt={service.title}
                className="ch-service-img"
                loading="lazy"
              />
            </div>
          ) : (
            <div className="ch-service-full-card__media ch-service-full-card__media--low-data">
              <div className="ch-low-data-overlay">
                <Icon name="image" size={20} />
                {service.image_size && (
                  <span className="ch-low-data-size">
                    {service.image_size >= 1024 * 1024
                      ? `${(service.image_size / (1024 * 1024)).toFixed(1)} MB`
                      : `${Math.round(service.image_size / 1024)} KB`}
                  </span>
                )}
                <span className="ch-low-data-notice">
                  {t ? t("services.photoHidden") : "Photo hidden (Low data)"}
                </span>
              </div>
              <button
                type="button"
                className="ch-load-photo-btn"
                onClick={handleReveal}
              >
                {t ? t("services.loadPhoto") : "Load photo"}
              </button>
            </div>
          )
        )}
      </div>

      <div className="ch-service-full-card__foot">
        <span className="ch-service-price">{priceLabel}</span>
        {!isMine && (
          <div className="ch-service-actions">
            {service.poster_phone ? (
              user ? (
                <a
                  href={formatWhatsAppUrl(service.poster_phone, service)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ch-contact-btn ch-contact-btn--whatsapp"
                  title={`WhatsApp: ${service.poster_phone}`}
                >
                  <Icon name="whatsapp" size={15} />
                  <span>{whatsappLabel}</span>
                </a>
              ) : (
                <button
                  type="button"
                  className="ch-contact-btn ch-contact-btn--whatsapp"
                  title="Create an account to contact this provider"
                  onClick={() => {
                    if (onRequireAuth) {
                      onRequireAuth("contact service providers or request services");
                    }
                  }}
                >
                  <Icon name="whatsapp" size={15} />
                  <span>{whatsappLabel}</span>
                </button>
              )
            ) : (
              <button
                type="button"
                className="ch-contact-btn ch-contact-btn--disabled"
                title={noPhoneHint}
                onClick={() => alert(noPhoneHint)}
              >
                <Icon name="whatsapp" size={15} />
                <span>{whatsappLabel}</span>
              </button>
            )}

            {service.poster_email ? (
              user ? (
                <a
                  href={formatEmailUrl(service.poster_email, service)}
                  className="ch-contact-btn ch-contact-btn--email"
                  title={`Email: ${service.poster_email}`}
                >
                  <Icon name="mail" size={15} />
                  <span>{emailLabel}</span>
                </a>
              ) : (
                <button
                  type="button"
                  className="ch-contact-btn ch-contact-btn--email"
                  title="Create an account to contact this provider"
                  onClick={() => {
                    if (onRequireAuth) {
                      onRequireAuth("contact service providers via email");
                    }
                  }}
                >
                  <Icon name="mail" size={15} />
                  <span>{emailLabel}</span>
                </button>
              )
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

