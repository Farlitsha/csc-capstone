import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import MobileLayout from "../layouts/MobileLayout";
import StatusChip from "../components/StatusChip";
import Chip from "../components/Chip";
import Button from "../components/Button";
import Field from "../components/Field";
import Icon from "../components/Icon";
import Spinner from "../components/Spinner";
import { api, ApiError, API_BASE_URL } from "../lib/api";
import { useLanguage } from "../i18n/LanguageContext";
import { useAuth } from "../auth/AuthContext";
import GuestAuthModal from "../components/GuestAuthModal";
import "./ServicesDirectoryPage.css";

const CATEGORIES = ["All", "Home repair", "Tutoring", "Food", "Other"];
const SERVICE_CATEGORIES = ["Home repair", "Tutoring", "Food", "Other"];

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
  const { user } = useAuth();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("explore"); // "explore" (others' services) or "mine" (own services)
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lowDataMode, setLowDataMode] = useState(() => localStorage.getItem("commhub_low_data") === "true");
  const [revealedPhotos, setRevealedPhotos] = useState([]);
  const [guestModalOpen, setGuestModalOpen] = useState(false);
  const [guestModalAction, setGuestModalAction] = useState("");

  // Editing state
  const [editingService, setEditingService] = useState(null);
  const [editForm, setEditForm] = useState({ title: "", description: "", price: "", category: "Home repair", type: "offer" });
  const [editPhotoFile, setEditPhotoFile] = useState(null);
  const [editPhotoPreview, setEditPhotoPreview] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const editFileInputRef = useRef(null);

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

  function loadServices() {
    setLoading(true);
    api
      .listServices({ category, query })
      .then(setServices)
      .catch(() => setError("Could not load services from the server."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadServices();
  }, [category, query]);

  // Reporting Modal State
  const [reportingService, setReportingService] = useState(null);
  const [reportReason, setReportReason] = useState("Scam or fraudulent activity");
  const [reportDetails, setReportDetails] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [reportError, setReportError] = useState("");

  const REPORT_PRESETS = [
    "Scam or fraudulent activity",
    "Inaccurate or misleading description",
    "Inappropriate or offensive content",
    "Unavailable or unresponsive poster",
    "Other concern",
  ];

  function openReportModal(service) {
    setReportingService(service);
    setReportReason("Scam or fraudulent activity");
    setReportDetails("");
    setReportSuccess(false);
    setReportError("");
  }

  async function handleReportSubmit(e) {
    e.preventDefault();
    if (!reportingService) return;
    setReportSubmitting(true);
    setReportError("");
    try {
      const fullReason = reportDetails.trim()
        ? `${reportReason}: ${reportDetails.trim()}`
        : reportReason;
      await api.reportService(reportingService.id, fullReason);
      setReportSuccess(true);
      setTimeout(() => {
        setReportingService(null);
        setReportSuccess(false);
      }, 1800);
    } catch (err) {
      setReportError(err instanceof ApiError ? err.detail : "Could not submit report.");
    } finally {
      setReportSubmitting(false);
    }
  }

  async function handleDelete(service) {

    if (!window.confirm(`Are you sure you want to delete your listing "${service.title}"? This cannot be undone.`)) {
      return;
    }
    try {
      await api.deleteService(service.id);
      setServices((prev) => prev.filter((s) => s.id !== service.id));
    } catch (err) {
      alert(err instanceof ApiError ? err.detail : "Could not delete service.");
    }
  }

  function startEdit(service) {
    setEditingService(service);
    setEditForm({
      title: service.title || "",
      description: service.description || "",
      price: service.price || "",
      category: service.category || "Home repair",
      type: service.type || "offer",
    });
    setEditPhotoFile(null);
    setEditPhotoPreview(service.image_url ? avatarSrc(service.image_url) : "");
    setEditError("");
  }

  function handleEditPhotoSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setEditPhotoFile(file);
    setEditPhotoPreview(URL.createObjectURL(file));
  }

  async function handleSaveEdit(e) {
    e.preventDefault();
    if (!editForm.title.trim() || !editForm.description.trim()) {
      setEditError("Title and description are required.");
      return;
    }
    setEditSaving(true);
    setEditError("");
    try {
      let imageUrl = editingService.image_url;
      if (editPhotoFile) {
        const uploadRes = await api.uploadServicePhoto(editPhotoFile);
        imageUrl = uploadRes?.image_url;
      }

      const updated = await api.updateService(editingService.id, {
        title: editForm.title.trim(),
        description: editForm.description.trim(),
        price: editForm.price.trim() || undefined,
        category: editForm.category,
        type: editForm.type,
        image_url: imageUrl,
      });

      setServices((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      setEditingService(null);
    } catch (err) {
      setEditError(err instanceof ApiError ? err.detail : "Could not update service.");
    } finally {
      setEditSaving(false);
    }
  }

  // Filter services based on tab
  const isOwnService = (s) => s.poster_id === user?.id || (user?.username && s.poster_username === user.username);
  const exploreServices = services.filter((s) => !isOwnService(s));
  const myServices = services.filter((s) => isOwnService(s));
  const displayedServices = activeTab === "mine" ? myServices : exploreServices;

  return (
    <MobileLayout title={t("services.title")} onBack={() => navigate(-1)}>
      {/* Top Main Tabs: Explore vs My Services */}
      <div className="ch-service-tabs-row">
        <button
          type="button"
          className={`ch-service-tab-btn ${activeTab === "explore" ? "ch-service-tab-btn--active" : ""}`}
          onClick={() => setActiveTab("explore")}
        >
          <Icon name="users" size={14} style={{ marginRight: 6 }} />
          Explore Services ({exploreServices.length})
        </button>
        <button
          type="button"
          className={`ch-service-tab-btn ${activeTab === "mine" ? "ch-service-tab-btn--active" : ""}`}
          onClick={() => setActiveTab("mine")}
        >
          <Icon name="briefcase" size={14} style={{ marginRight: 6 }} />
          My Listings ({myServices.length})
        </button>
      </div>

      <div className="ch-services-search">
        <input
          type="search"
          placeholder={t("services.search")}
          aria-label={t("services.search") || "Search services"}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="ch-services-toolbar">
        <div className="ch-services-filters" role="group" aria-label="Filter by category">
          {CATEGORIES.map((c) => (
            <Chip key={c} label={c} active={category === c} onClick={() => setCategory(c)} />
          ))}
        </div>
        <button
          type="button"
          className={`ch-low-data-btn ${lowDataMode ? "ch-low-data-btn--active" : ""}`}
          onClick={toggleLowData}
          aria-pressed={lowDataMode}
          title="Toggle low data optimization"
        >
          <Icon name={lowDataMode ? "lightning" : "image"} size={13} style={{ marginRight: 6 }} />
          {lowDataMode ? t("services.lowDataOn") : t("services.lowDataOff")}
        </button>
      </div>

      <div className="ch-services-post-cta">
        <Button
          variant="accent"
          fullWidth
          onClick={() => {
            if (!user) {
              setGuestModalAction("post a service or request");
              setGuestModalOpen(true);
            } else {
              navigate("/services/new");
            }
          }}
        >
          {t("services.postButton")}
        </Button>
      </div>

      {/* Screen-reader live region announcing filter updates */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {!loading && !error && `${displayedServices.length} service${displayedServices.length === 1 ? "" : "s"} found for category ${category}${query ? ` matching "${query}"` : ""}`}
      </div>

      <div className="ch-services-list">
        {loading && <Spinner />}
        {error && <p className="ch-services-empty ch-services-empty--error" role="alert">{error}</p>}
        {!loading && !error && displayedServices.length === 0 && (
          <div className="ch-services-empty-state">
            <p>
              {activeTab === "mine"
                ? !user
                  ? "You are browsing as a guest. Create an account or log in to post, edit, and manage your personal listings."
                  : "You haven't posted any services yet. Click above to post your first service!"
                : "No services posted by other community members found in this category."}
            </p>
            {activeTab === "mine" && !user && (
              <div style={{ display: "flex", gap: "8px", justifyContent: "center", marginTop: "12px" }}>
                <Button variant="accent" onClick={() => navigate("/signup")}>
                  Create Free Account
                </Button>
                <Button variant="secondary" onClick={() => navigate("/login")}>
                  Log In
                </Button>
              </div>
            )}
            {activeTab === "explore" && myServices.length > 0 && (
              <button
                type="button"
                className="ch-switch-tab-btn"
                onClick={() => setActiveTab("mine")}
              >
                View your ({myServices.length}) personal listings →
              </button>
            )}
          </div>
        )}

        {displayedServices.map((s) => {
          const hasImage = Boolean(s.image_url);
          const isPhotoVisible = !lowDataMode || revealedPhotos.includes(s.id);
          const isMine = isOwnService(s);

          return (
            <div className={`ch-service-full-card ${isMine ? "ch-service-full-card--mine" : ""}`} key={s.id}>
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
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <StatusChip
                    label={s.type === "request" ? t("services.requested") : t("services.offered")}
                    tone={s.type === "request" ? "warning" : "positive"}
                  />
                  {isMine && (
                    <span className="ch-own-badge">
                      Your Post
                    </span>
                  )}
                </div>

                {isMine ? (
                  <div className="ch-own-actions">
                    <button
                      type="button"
                      className="ch-edit-action-btn"
                      title="Edit this listing"
                      onClick={() => startEdit(s)}
                    >
                      <Icon name="edit" size={13} style={{ marginRight: 4 }} />
                      Edit
                    </button>
                    <button
                      type="button"
                      className="ch-delete-action-btn"
                      title="Delete this listing"
                      onClick={() => handleDelete(s)}
                    >
                      Delete
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="ch-service-report-btn"
                    title="Report listing"
                    onClick={() => {
                      if (!user) {
                        setGuestModalAction("report a service listing");
                        setGuestModalOpen(true);
                      } else {
                        openReportModal(s);
                      }
                    }}
                  >
                    <Icon name="flag" size={12} style={{ marginRight: 4 }} />
                    Report
                  </button>
                )}
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
                  {isMine ? `${s.poster_display_name || s.poster_username} (You)` : (s.poster_display_name || s.poster_username)}
                </span>
              </div>

              <p>{s.description}</p>

              <div className="ch-service-full-card__foot">
                <span className="ch-service-price">{s.price || t("services.priceOnRequest")}</span>
                {!isMine && (
                  <div className="ch-service-actions">
                    {s.poster_phone ? (
                      user ? (
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
                          className="ch-contact-btn ch-contact-btn--whatsapp"
                          title="Create an account to contact this provider"
                          onClick={() => {
                            setGuestModalAction("contact service providers or request services");
                            setGuestModalOpen(true);
                          }}
                        >
                          <Icon name="whatsapp" size={15} />
                          <span>{t("services.whatsapp")}</span>
                        </button>
                      )
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
                      user ? (
                        <a
                          href={formatEmailUrl(s.poster_email, s)}
                          className="ch-contact-btn ch-contact-btn--email"
                          title={`Email: ${s.poster_email}`}
                        >
                          <Icon name="mail" size={15} />
                          <span>{t("services.email")}</span>
                        </a>
                      ) : (
                        <button
                          type="button"
                          className="ch-contact-btn ch-contact-btn--email"
                          title="Create an account to contact this provider"
                          onClick={() => {
                            setGuestModalAction("contact service providers via email");
                            setGuestModalOpen(true);
                          }}
                        >
                          <Icon name="mail" size={15} />
                          <span>{t("services.email")}</span>
                        </button>
                      )
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Service Modal */}
      {editingService && (
        <div className="ch-edit-modal-overlay">
          <div className="ch-edit-modal">
            <div className="ch-edit-modal__head">
              <h3>Edit Service Listing</h3>
              <button
                type="button"
                className="ch-edit-modal__close"
                onClick={() => setEditingService(null)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="ch-edit-modal__form">
              {editError && <div className="ch-edit-error">{editError}</div>}

              {/* Type Switcher */}
              <div className="ch-field-block">
                <span className="ch-field-block__label">Listing Type</span>
                <div style={{ display: "flex", gap: "8px" }}>
                  <Chip
                    label="I'm offering this"
                    active={editForm.type === "offer"}
                    onClick={() => setEditForm((f) => ({ ...f, type: "offer" }))}
                  />
                  <Chip
                    label="I'm looking for this"
                    active={editForm.type === "request"}
                    onClick={() => setEditForm((f) => ({ ...f, type: "request" }))}
                  />
                </div>
              </div>

              {/* Category */}
              <div className="ch-field-block">
                <span className="ch-field-block__label">Category</span>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {SERVICE_CATEGORIES.map((c) => (
                    <Chip
                      key={c}
                      label={c}
                      active={editForm.category === c}
                      onClick={() => setEditForm((f) => ({ ...f, category: c }))}
                    />
                  ))}
                </div>
              </div>

              <Field
                label="Service title"
                id="edit_title"
                value={editForm.title}
                onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                required
              />

              <Field
                label="Description"
                id="edit_desc"
                as="textarea"
                value={editForm.description}
                onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                required
              />

              <Field
                label="Price (ZAR) — optional"
                id="edit_price"
                placeholder="e.g. 150 or Free"
                value={editForm.price}
                onChange={(e) => setEditForm((f) => ({ ...f, price: e.target.value }))}
              />

              {/* Photo */}
              <div className="ch-field-block">
                <span className="ch-field-block__label">Photo (optional)</span>
                {editPhotoPreview ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                    <img
                      src={editPhotoPreview}
                      alt="Preview"
                      style={{ width: "60px", height: "60px", objectFit: "cover", borderRadius: "8px" }}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => editFileInputRef.current?.click()}
                    >
                      Change photo
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => editFileInputRef.current?.click()}
                  >
                    + Add a photo
                  </Button>
                )}
                <input
                  ref={editFileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  style={{ display: "none" }}
                  onChange={handleEditPhotoSelect}
                />
              </div>

              <div className="ch-edit-modal__actions">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setEditingService(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="accent"
                  disabled={editSaving}
                >
                  {editSaving ? "Saving…" : "Save Changes"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Report Service Modal */}
      {reportingService && (
        <div className="ch-edit-modal-overlay">
          <div className="ch-edit-modal">
            <div className="ch-edit-modal__head">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Icon name="flag" size={18} style={{ color: "#dc2626" }} />
                <h3 style={{ margin: 0 }}>Report Listing</h3>
              </div>
              <button
                type="button"
                className="ch-edit-modal__close"
                onClick={() => setReportingService(null)}
              >
                ✕
              </button>
            </div>

            {reportSuccess ? (
              <div className="ch-report-success-msg">
                <Icon name="check" size={20} style={{ color: "#059669", marginBottom: "6px" }} />
                <h4>Thank you for letting us know</h4>
                <p>This listing has been flagged for administrator review to keep our community safe.</p>
              </div>
            ) : (
              <form onSubmit={handleReportSubmit} className="ch-edit-modal__form">
                <p style={{ margin: "0 0 10px", fontSize: "13px", color: "var(--color-sage)" }}>
                  Help keep CommHub safe. Why are you reporting <strong>"{reportingService.title}"</strong>?
                </p>

                {reportError && <div className="ch-edit-error">{reportError}</div>}

                <div className="ch-field-block">
                  <span className="ch-field-block__label">Reason</span>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {REPORT_PRESETS.map((preset) => (
                      <label
                        key={preset}
                        className={`ch-report-option ${reportReason === preset ? "ch-report-option--selected" : ""}`}
                        onClick={() => setReportReason(preset)}
                      >
                        <input
                          type="radio"
                          name="report_reason"
                          checked={reportReason === preset}
                          onChange={() => setReportReason(preset)}
                          style={{ accentColor: "var(--color-teal-700)" }}
                        />
                        <span>{preset}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <Field
                  label="Additional details (optional)"
                  id="report_details"
                  as="textarea"
                  placeholder="Provide any extra context to help moderators evaluate this listing..."
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                />

                <div className="ch-edit-modal__actions">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setReportingService(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="accent"
                    disabled={reportSubmitting}
                    style={{ background: "#dc2626", borderColor: "#dc2626" }}
                  >
                    {reportSubmitting ? "Submitting…" : "Submit Report"}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <GuestAuthModal
        isOpen={guestModalOpen}
        onClose={() => setGuestModalOpen(false)}
        actionName={guestModalAction}
      />
    </MobileLayout>
  );
}

