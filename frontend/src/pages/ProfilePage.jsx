import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MobileLayout from "../layouts/MobileLayout";
import Card from "../components/Card";
import Button from "../components/Button";
import StatusChip from "../components/StatusChip";
import { api, ApiError, API_BASE_URL } from "../lib/api";
import { useAuth } from "../auth/AuthContext";
import { useLanguage } from "../i18n/LanguageContext";
import "./ProfilePage.css";

// ── Helpers ────────────────────────────────────────────────────────────────────

function getInitials(user) {
  const name = user?.display_name || user?.username || "";
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "?";
}

function avatarSrc(url) {
  if (!url) return null;
  // If the URL is already absolute (http/https), use it directly
  if (url.startsWith("http")) return url;
  // Otherwise prepend the API base so the browser can reach the /uploads mount
  return `${API_BASE_URL}${url}`;
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, logout, refreshUser } = useAuth();
  const { t } = useLanguage();

  // ── UI toggle ───────────────────────────────────────────────────────────────
  const [showEdit, setShowEdit] = useState(false);

  // ── Profile picture state ──────────────────────────────────────────────────
  const fileInputRef = useRef(null);
  const [picUploading, setPicUploading] = useState(false);
  const [picError, setPicError] = useState("");

  // ── Profile form state ──────────────────────────────────────────────────────
  const [form, setForm] = useState({
    display_name: user?.display_name ?? "",
    bio: user?.bio ?? "",
    phone: user?.phone ?? user?.contact_phone ?? "",
    contact_phone: user?.contact_phone ?? user?.phone ?? "",
    contact_email: user?.contact_email ?? user?.email ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    if (user && !showEdit) {
      setForm({
        display_name: user.display_name ?? "",
        bio: user.bio ?? "",
        phone: user.phone ?? user.contact_phone ?? "",
        contact_phone: user.contact_phone ?? user.phone ?? "",
        contact_email: user.contact_email ?? user.email ?? "",
      });
    }
  }, [user, showEdit]);

  // ── Activity state ──────────────────────────────────────────────────────────
  const [activity, setActivity] = useState([]);
  const [activityLoading, setActivityLoading] = useState(true);

  // ── Role upgrade state ──────────────────────────────────────────────────────
  const [updating, setUpdating] = useState(false);
  const [roleMessage, setRoleMessage] = useState("");
  const [roleError, setRoleError] = useState("");
  const [canBootstrapAdmin, setCanBootstrapAdmin] = useState(false);

  const ROLE_LABEL = {
    community_member: t("profile.roleCommunityMember"),
    researcher: t("profile.roleResearcher"),
    admin: t("profile.roleAdmin"),
  };

  useEffect(() => {
    api
      .getAdminBootstrapStatus()
      .then((res) => setCanBootstrapAdmin(Boolean(res?.can_bootstrap_admin)))
      .catch(() => setCanBootstrapAdmin(false));
  }, [user?.role]);

  // ── Load activity on mount ──────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    setActivityLoading(true);
    if (user.role === "community_member") {
      api.getMyApplications()
        .then(setActivity)
        .catch(() => setActivity([]))
        .finally(() => setActivityLoading(false));
    } else if (user.role === "researcher") {
      api.listStudies()
        .then((studies) => setActivity(studies.filter((s) => s.researcher_id === user.id)))
        .catch(() => setActivity([]))
        .finally(() => setActivityLoading(false));
    } else {
      // Admin — no activity feed
      setActivity([]);
      setActivityLoading(false);
    }
  }, [user?.id, user?.role]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  function handleFormChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handlePicFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPicError("");
    setPicUploading(true);
    try {
      await api.uploadAvatar(file);
      await refreshUser();
    } catch (err) {
      setPicError(err instanceof ApiError ? err.detail : "Could not upload image.");
    } finally {
      setPicUploading(false);
      // Reset the input so the same file can be re-selected if needed
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSaveProfile(e) {
    e.preventDefault();
    setSaving(true);
    setSaveMessage("");
    setSaveError("");
    try {
      // Only send fields that are non-empty strings, to avoid overwriting with blanks
      const payload = {};
      for (const [key, val] of Object.entries(form)) {
        if (typeof val === "string" && val.trim() !== "") {
          payload[key] = val.trim();
        }
      }
      if (form.phone && !payload.contact_phone) {
        payload.contact_phone = form.phone.trim();
      }
      if (form.contact_phone && !payload.phone) {
        payload.phone = form.contact_phone.trim();
      }
      await api.updateProfile(payload);
      await refreshUser();
      setSaveMessage("Profile saved successfully.");
      setShowEdit(false);
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.detail : "Could not save profile.");
    } finally {
      setSaving(false);
    }
  }

  async function requestRole(role) {
    if (!user) return;
    setUpdating(true);
    setRoleMessage("");
    setRoleError("");
    try {
      await api.updateUserRole(user.id, role);
      setCanBootstrapAdmin(false);
      await refreshUser();
      setRoleMessage(`You are now an administrator.`);
    } catch (err) {
      setRoleError(err instanceof ApiError ? err.detail : "Could not claim admin role. An administrator may already exist.");
      api
        .getAdminBootstrapStatus()
        .then((res) => setCanBootstrapAdmin(Boolean(res?.can_bootstrap_admin)))
        .catch(() => {});
    } finally {
      setUpdating(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  const src = avatarSrc(user?.avatar_url);

  // Activity card title / empty text depend on role
  const isResearcher = user?.role === "researcher";
  const isMember = user?.role === "community_member";

  return (
    <MobileLayout title={t("profile.heading")} onBack={() => navigate(-1)}>
      <div className="ch-profile">

        {/* ── Profile picture ── */}
        <div className="ch-profile__avatar-section">
          <button
            className="ch-profile__avatar-wrap"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Change profile picture"
            disabled={picUploading}
          >
            {src ? (
              <img
                className="ch-profile__avatar-img"
                src={src}
                alt={`${user?.display_name || user?.username} profile picture`}
              />
            ) : (
              <span className="ch-profile__avatar-initials">{getInitials(user)}</span>
            )}
            <span className="ch-profile__avatar-overlay">
              {picUploading ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                </svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
              )}
            </span>
          </button>
          <p className="ch-profile__avatar-name">
            {user?.display_name || user?.username}
          </p>
          <p className="ch-profile__avatar-hint">Tap to upload a photo</p>
          {picError && <p className="ch-profile__error ch-profile__avatar-error">{picError}</p>}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            style={{ display: "none" }}
            onChange={handlePicFileChange}
          />

          {/* Edit Profile toggle button */}
          <Button
            variant="secondary"
            onClick={() => setShowEdit((v) => !v)}
          >
            {showEdit ? "Cancel" : "Edit Profile"}
          </Button>
          {saveMessage && !showEdit && (
            <p className="ch-profile__success">{saveMessage}</p>
          )}
        </div>

        {/* ── Editable profile form (shown only when toggled) ── */}
        {showEdit && (
          <Card title="Edit Profile">
            <form className="ch-profile__form" onSubmit={handleSaveProfile}>
              <label className="ch-profile__field">
                <span className="ch-profile__label">Display Name</span>
                <input
                  className="ch-profile__input"
                  name="display_name"
                  type="text"
                  placeholder="How should others see you?"
                  value={form.display_name}
                  onChange={handleFormChange}
                  maxLength={100}
                />
              </label>

              <label className="ch-profile__field">
                <span className="ch-profile__label">Bio</span>
                <textarea
                  className="ch-profile__input ch-profile__textarea"
                  name="bio"
                  placeholder="Tell the community about yourself…"
                  value={form.bio}
                  onChange={handleFormChange}
                  maxLength={500}
                  rows={3}
                />
              </label>

              <label className="ch-profile__field">
                <span className="ch-profile__label">Phone / WhatsApp Number</span>
                <input
                  className="ch-profile__input"
                  name="phone"
                  type="tel"
                  placeholder="e.g. +27 82 123 4567"
                  value={form.phone || form.contact_phone}
                  onChange={(e) => {
                    handleFormChange(e);
                    setForm((prev) => ({ ...prev, phone: e.target.value, contact_phone: e.target.value }));
                  }}
                  maxLength={50}
                />
              </label>

              <label className="ch-profile__field">
                <span className="ch-profile__label">Contact Email</span>
                <input
                  className="ch-profile__input"
                  name="contact_email"
                  type="email"
                  placeholder="Public contact email (optional)"
                  value={form.contact_email}
                  onChange={handleFormChange}
                  maxLength={255}
                />
              </label>

              <div className="ch-profile__save-row">
                {saveError && <p className="ch-profile__error">{saveError}</p>}
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving…" : "Save Profile"}
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* ── Read-only account details ── */}
        <Card title={t("profile.account")}>
          <div className="ch-profile__details">
            <div>
              <span className="ch-profile__label">{t("profile.username")}</span>
              <p className="ch-profile__value">{user?.username || "—"}</p>
            </div>
            <div>
              <span className="ch-profile__label">Login Email</span>
              <p className="ch-profile__value">{user?.email || "—"}</p>
            </div>
            <div>
              <span className="ch-profile__label">{t("profile.phone")}</span>
              <p className="ch-profile__value">{user?.phone || user?.contact_phone || "—"}</p>
            </div>
            <div>
              <span className="ch-profile__label">{t("profile.role")}</span>
              <StatusChip
                label={ROLE_LABEL[user?.role] || user?.role || "—"}
                tone={user?.role === "admin" ? "warning" : "positive"}
              />
            </div>
          </div>
        </Card>

        {/* ── Activity card (community members & researchers only) ── */}
        {(isMember || isResearcher) && (
          <Card title={isResearcher ? "My Posted Studies" : "My Study Applications"}>
            <div className="ch-profile__activity">
              {activityLoading && (
                <p className="ch-profile__activity-empty">Loading…</p>
              )}
              {!activityLoading && activity.length === 0 && (
                <p className="ch-profile__activity-empty">
                  {isResearcher
                    ? "You haven't posted any studies yet."
                    : "You haven't applied to any studies yet."}
                </p>
              )}
              {!activityLoading && activity.map((item) => (
                <div className="ch-profile__activity-item" key={item.id}>
                  {isResearcher ? (
                    <>
                      <span className="ch-profile__activity-title">{item.title}</span>
                      <StatusChip
                        label={item.state}
                        tone={item.state === "live" ? "positive" : "neutral"}
                      />
                    </>
                  ) : (
                    <>
                      <span className="ch-profile__activity-title">{item.study_title}</span>
                      <StatusChip
                        label={item.status}
                        tone={
                          item.status === "accepted"
                            ? "positive"
                            : item.status === "declined"
                            ? "danger"
                            : "neutral"
                        }
                      />
                    </>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* ── Admin Bootstrap Card (Only visible before first platform admin is created) ── */}
        {canBootstrapAdmin && user?.role !== "admin" && (
          <Card title={t("profile.adminBootstrapTitle") || "Claim Administrator Role"}>
            <div className="ch-profile__roles">
              <p className="ch-profile__hint">
                {t("profile.adminBootstrapHint") ||
                  "No platform administrator exists yet. Claim admin privileges for this account to manage users and listings. Once an administrator is confirmed, this option will permanently disappear."}
              </p>
              <div className="ch-profile__role-buttons">
                <Button variant="accent" disabled={updating} onClick={() => requestRole("admin")}>
                  {t("profile.becomeAdmin") || "Become Administrator"}
                </Button>
              </div>
              {roleMessage && <p className="ch-profile__success">{roleMessage}</p>}
              {roleError && <p className="ch-profile__error">{roleError}</p>}
            </div>
          </Card>
        )}

        <Button variant="secondary" fullWidth onClick={logout}>
          {t("common.logout")}
        </Button>
      </div>
    </MobileLayout>
  );
}
