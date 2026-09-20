import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MobileLayout from "../layouts/MobileLayout";
import Card from "../components/Card";
import Button from "../components/Button";
import StatusChip from "../components/StatusChip";
import HelpCentreCard from "../components/HelpCentreCard";
import { api, ApiError, API_BASE_URL } from "../lib/api";
import { useAuth } from "../auth/AuthContext";
import { useLanguage } from "../i18n/LanguageContext";
import "./ProfilePage.css";

// Helpers

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

// Component

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, logout, refreshUser } = useAuth();
  const { t } = useLanguage();

  // UI toggle
  const [showEdit, setShowEdit] = useState(false);

  // Profile picture state
  const fileInputRef = useRef(null);
  const [picUploading, setPicUploading] = useState(false);
  const [picError, setPicError] = useState("");

  // Profile form state
  const [form, setForm] = useState({
    username: user?.username ?? "",
    display_name: user?.display_name ?? "",
    phone: user?.phone ?? user?.contact_phone ?? "",
    contact_phone: user?.contact_phone ?? user?.phone ?? "",
    contact_email: user?.contact_email ?? user?.email ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");

  // Deactivation and deletion modals state
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [accountActionLoading, setAccountActionLoading] = useState(false);
  const [accountActionError, setAccountActionError] = useState("");

  // Researcher application & downgrade states
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applyPhone, setApplyPhone] = useState("");
  const [applySubmitting, setApplySubmitting] = useState(false);
  const [applyError, setApplyError] = useState("");

  const [showDowngradeModal, setShowDowngradeModal] = useState(false);
  const [downgradeSubmitting, setDowngradeSubmitting] = useState(false);
  const [downgradeError, setDowngradeError] = useState("");

  const isWithinGracePeriod = Boolean(
    user?.role === "community_member" &&
    user?.researcher_downgraded_at &&
    (Date.now() - new Date(user.researcher_downgraded_at).getTime()) <= 180 * 24 * 60 * 60 * 1000
  );

  useEffect(() => {
    if (user && !showEdit) {
      setForm({
        username: user.username ?? "",
        display_name: user.display_name ?? "",
        phone: user.phone ?? user.contact_phone ?? "",
        contact_phone: user.contact_phone ?? user.phone ?? "",
        contact_email: user.contact_email ?? user.email ?? "",
      });
    }
  }, [user, showEdit]);

  // Activity state
  const [activity, setActivity] = useState([]);
  const [activityLoading, setActivityLoading] = useState(true);

  const ROLE_LABEL = {
    community_member: t("profile.roleCommunityMember"),
    researcher: t("profile.roleResearcher"),
    admin: t("profile.roleAdmin"),
  };

  // Load activity on mount
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

  // Handlers

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
    setSaveMessage("");
    setSaveError("");

    if (form.username && form.username.trim().length < 3) {
      setSaveError("Username must be at least 3 characters long.");
      return;
    }
    if (form.username && !/^[a-zA-Z0-9_\.\-]+$/.test(form.username.trim())) {
      setSaveError("Username may only contain letters, numbers, underscores, dashes, and periods.");
      return;
    }

    setSaving(true);
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

  async function handleDeactivateAccount() {
    setAccountActionLoading(true);
    setAccountActionError("");
    try {
      await api.deactivateMyAccount();
      logout();
      navigate("/login", {
        replace: true,
        state: { flashMessage: "Your account has been deactivated. You can sign in anytime to reactivate it." },
      });
    } catch (err) {
      setAccountActionError(err instanceof ApiError ? err.detail : "Could not deactivate account.");
      setAccountActionLoading(false);
    }
  }

  async function handleDeleteAccount() {
    if (deleteConfirmText.trim().toLowerCase() !== "delete") {
      setAccountActionError("Please type DELETE to confirm permanent deletion.");
      return;
    }
    setAccountActionLoading(true);
    setAccountActionError("");
    try {
      await api.deleteMyAccount();
      logout();
      navigate("/login", {
        replace: true,
        state: { flashMessage: "Your account and all associated personal data have been permanently deleted." },
      });
    } catch (err) {
      setAccountActionError(err instanceof ApiError ? err.detail : "Could not delete account.");
      setAccountActionLoading(false);
    }
  }

  async function handleApplyResearcher(e) {
    e.preventDefault();
    if (!applyPhone.trim()) {
      setApplyError("Please enter your contact phone or WhatsApp number.");
      return;
    }
    setApplySubmitting(true);
    setApplyError("");
    try {
      await api.requestResearcherUpgrade({ phone: applyPhone.trim() });
      await refreshUser();
      setShowApplyModal(false);
    } catch (err) {
      setApplyError(err instanceof ApiError ? err.detail : "Could not submit researcher application.");
    } finally {
      setApplySubmitting(false);
    }
  }

  async function handleDowngradeToCommunity() {
    setDowngradeSubmitting(true);
    setDowngradeError("");
    try {
      await api.downgradeToCommunity();
      await refreshUser();
      setShowDowngradeModal(false);
    } catch (err) {
      setDowngradeError(err instanceof ApiError ? err.detail : "Could not switch account role.");
    } finally {
      setDowngradeSubmitting(false);
    }
  }

  // Render

  const src = avatarSrc(user?.avatar_url);

  // Activity card title / empty text depend on role
  const isResearcher = user?.role === "researcher";
  const isMember = user?.role === "community_member";

  return (
    <MobileLayout title={t("profile.heading")} onBack={() => navigate(-1)}>
      <div className="ch-profile">

        {/* Profile picture */}
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
                alt={`${user?.display_name || user?.username || "User"} profile picture`}
              />
            ) : (
              <span className="ch-profile__avatar-placeholder">
                <svg
                  className="ch-profile__avatar-default-icon"
                  width="44"
                  height="44"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </span>
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
            <p className="ch-profile__success" role="status" aria-live="polite">{saveMessage}</p>
          )}
        </div>

        {/* Editable profile form (shown only when toggled) */}
        {showEdit && (
          <Card title="Edit Profile">
            <form className="ch-profile__form" onSubmit={handleSaveProfile}>
              <label className="ch-profile__field">
                <span className="ch-profile__label">Username</span>
                <input
                  className="ch-profile__input"
                  name="username"
                  type="text"
                  placeholder="e.g. nomvula_k"
                  value={form.username}
                  onChange={handleFormChange}
                  maxLength={50}
                  required
                />
              </label>

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
                {saveError && <p className="ch-profile__error" role="alert" aria-live="assertive">{saveError}</p>}
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving…" : "Save Profile"}
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/*Read-only account details */}
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
              <p className="ch-profile__value">{ROLE_LABEL[user?.role] || user?.role || "—"}</p>
            </div>
          </div>
        </Card>

        {/* Researcher Status or Application Card */}
        {user?.role !== "admin" && (
          <>
            {user?.role === "researcher" ? (
              user.verification_status === "verified" ? (
                <Card title="Researcher Status">
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <StatusChip label="Verified Researcher" tone="positive" />
                      <span style={{ fontSize: "13px", color: "var(--color-ink, #475569)" }}>
                        You have full researcher privileges to create studies, surveys, and schedule workshops.
                      </span>
                    </div>
                    <div>
                      <Button
                        variant="secondary"
                        className="ch-btn--warning"
                        onClick={() => {
                          setDowngradeError("");
                          setShowDowngradeModal(true);
                        }}
                      >
                        Switch Back to Community Member
                      </Button>
                    </div>
                  </div>
                </Card>
              ) : user.verification_status === "rejected" ? (
                <Card title="Researcher Application">
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <StatusChip label="Application Not Approved" tone="danger" />
                      <span style={{ fontSize: "13px", color: "var(--color-ink, #475569)" }}>
                        An administrator reviewed your researcher request and could not approve it at this time.
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      <Button
                        variant="accent"
                        onClick={() => {
                          setApplyPhone(user?.phone || user?.contact_phone || "");
                          setApplyError("");
                          setShowApplyModal(true);
                        }}
                      >
                        Re-apply as Researcher
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setDowngradeError("");
                          setShowDowngradeModal(true);
                        }}
                      >
                        Return to Community Member
                      </Button>
                    </div>
                  </div>
                </Card>
              ) : (
                <Card title="Researcher Application">
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <StatusChip label="Under Review (Pending Admin Verification)" tone="warning" />
                      <span style={{ fontSize: "13px", color: "var(--color-ink, #475569)" }}>
                        Your researcher application is awaiting review by a community administrator.
                      </span>
                    </div>
                    <div>
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setDowngradeError("");
                          setShowDowngradeModal(true);
                        }}
                      >
                        Cancel Application & Stay Community Member
                      </Button>
                    </div>
                  </div>
                </Card>
              )
            ) : user?.role === "community_member" ? (
              isWithinGracePeriod ? (
                <Card title="Researcher Account (Preserved)">
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <StatusChip label="6-Month Grace Period Active" tone="positive" />
                      <span style={{ fontSize: "13px", color: "var(--color-ink, #475569)", fontWeight: 600 }}>
                        Quick Restoration Available
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: "13px", color: "var(--color-ink, #334155)", lineHeight: 1.5 }}>
                      Your studies, surveys, and researcher records have been preserved for 6 months (hidden from public view). Because you previously held verified researcher status, you can restore your account immediately without administrator re-verification.
                    </p>
                    <div>
                      <Button
                        variant="accent"
                        onClick={() => {
                          setApplyPhone(user?.phone || user?.contact_phone || "");
                          setApplyError("");
                          setShowApplyModal(true);
                        }}
                      >
                        Re-activate Researcher Account
                      </Button>
                    </div>
                  </div>
                </Card>
              ) : (
                <Card title="Researcher Privileges">
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <p style={{ margin: 0, fontSize: "13px", color: "var(--color-ink, #334155)", lineHeight: 1.5 }}>
                      Are you an academic or community researcher? Apply to create community studies and surveys, organize workshops, and gather local insights.
                    </p>
                    <div>
                      <Button
                        variant="accent"
                        onClick={() => {
                          setApplyPhone(user?.phone || user?.contact_phone || "");
                          setApplyError("");
                          setShowApplyModal(true);
                        }}
                      >
                        Apply to be a Researcher
                      </Button>
                    </div>
                  </div>
                </Card>
              )
            ) : null}
          </>
        )}

        {/* Activity card (community members & researchers only) */}
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
                        icon={item.state === "live" ? "" : undefined}
                      />
                    </>
                  ) : (
                    <>
                      <span className="ch-profile__activity-title">{item.study_title}</span>
                      <StatusChip
                        label={item.has_submitted_survey ? "completed" : item.status}
                        tone={
                          item.has_submitted_survey
                            ? "positive"
                            : item.status === "accepted"
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

        {/* Legal & Data Privacy Information */}
        <Card title="Legal & Data Privacy">
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "4px 4px 6px" }}>
            <p style={{ margin: 0, fontSize: "12.5px", color: "var(--color-sage)" }}>
              CommHub processes personal data in accordance with South Africa's POPIA legislation. Review platform rules and data privacy rights:
            </p>
            <div style={{ display: "flex", gap: "12px", fontSize: "13px" }}>
              <a href="/terms" style={{ color: "var(--color-teal-700)", fontWeight: 700, textDecoration: "underline" }}>
                Terms & Conditions
              </a>
              <span style={{ color: "var(--color-line)" }}>•</span>
              <a href="/privacy" style={{ color: "var(--color-teal-700)", fontWeight: 700, textDecoration: "underline" }}>
                Privacy Policy (POPIA)
              </a>
            </div>
          </div>
        </Card>

        {/* Account Deactivation & Deletion (Community Members & Researchers) */}
        {user?.role !== "admin" && (
          <Card title="Account Management & Danger Zone">
            <div className="ch-profile__danger-zone">
              <div className="ch-profile__danger-item">
                <div className="ch-profile__danger-info">
                  <h4 className="ch-profile__danger-title">Deactivate Account</h4>
                  <p className="ch-profile__danger-desc">
                    Temporarily disable your profile and pause active listings/bookings. You will be signed out immediately. You can reactivate anytime.
                  </p>
                </div>
                <Button
                  variant="secondary"
                  className="ch-btn--warning"
                  onClick={() => {
                    setAccountActionError("");
                    setShowDeactivateModal(true);
                  }}
                >
                  Deactivate
                </Button>
              </div>

              <div className="ch-profile__danger-divider" />

              <div className="ch-profile__danger-item">
                <div className="ch-profile__danger-info">
                  <h4 className="ch-profile__danger-title ch-profile__danger-title--delete">
                    Delete Account Permanently
                  </h4>
                  <p className="ch-profile__danger-desc">
                    Permanently erase your account, personal data, and all listings or applications under POPIA right to erasure. This action cannot be undone.
                  </p>
                </div>
                <Button
                  variant="danger"
                  onClick={() => {
                    setAccountActionError("");
                    setDeleteConfirmText("");
                    setShowDeleteModal(true);
                  }}
                >
                  Delete Account
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Community Help Centre Card */}
        <HelpCentreCard showPolicyLinks={false} />

        <Button variant="secondary" fullWidth onClick={logout}>
          {t("common.logout")}
        </Button>
      </div>

      {/* Deactivate Confirmation Modal */}
      {showDeactivateModal && (
        <div className="ch-profile-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="deactivate-modal-title">
          <div className="ch-profile-modal-card">
            <h3 id="deactivate-modal-title" className="ch-profile-modal-title">
              Deactivate Your Account?
            </h3>
            <p className="ch-profile-modal-text">
              You will be signed out immediately. Your profile, listings, and applications will remain saved, but won't be active while deactivated. You can sign in anytime to reactivate your account.
            </p>
            {accountActionError && (
              <p className="ch-profile__error" style={{ marginBottom: "12px" }} role="alert">
                {accountActionError}
              </p>
            )}
            <div className="ch-profile-modal-actions">
              <Button
                variant="secondary"
                onClick={() => setShowDeactivateModal(false)}
                disabled={accountActionLoading}
              >
                Cancel
              </Button>
              <Button
                variant="secondary"
                className="ch-btn--warning"
                onClick={handleDeactivateAccount}
                disabled={accountActionLoading}
              >
                {accountActionLoading ? "Deactivating…" : "Yes, Deactivate Account"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="ch-profile-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="delete-modal-title">
          <div className="ch-profile-modal-card">
            <h3 id="delete-modal-title" className="ch-profile-modal-title ch-profile-modal-title--danger">
              Permanently Delete Account?
            </h3>
            <p className="ch-profile-modal-text">
              This action is <strong>permanent and irreversible</strong>. All your personal data, services, workshop registrations, and study applications will be completely erased.
            </p>
            <p className="ch-profile-modal-text" style={{ fontSize: "13px", fontWeight: 600 }}>
              To confirm, please type <span style={{ color: "var(--color-danger)", letterSpacing: "1px" }}>DELETE</span> below:
            </p>
            <input
              type="text"
              className="ch-profile__input"
              style={{ marginBottom: "12px" }}
              placeholder="Type DELETE"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              autoFocus
            />
            {accountActionError && (
              <p className="ch-profile__error" style={{ marginBottom: "12px" }} role="alert">
                {accountActionError}
              </p>
            )}
            <div className="ch-profile-modal-actions">
              <Button
                variant="secondary"
                onClick={() => setShowDeleteModal(false)}
                disabled={accountActionLoading}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleDeleteAccount}
                disabled={accountActionLoading || deleteConfirmText.trim().toLowerCase() !== "delete"}
              >
                {accountActionLoading ? "Deleting…" : "Permanently Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Apply to be a Researcher Modal */}
      {showApplyModal && (
        <div className="ch-profile-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="apply-researcher-modal-title">
          <div className="ch-profile-modal-card">
            <h3 id="apply-researcher-modal-title" className="ch-profile-modal-title">
              {isWithinGracePeriod ? "Re-activate Researcher Account" : "Apply to be a Researcher"}
            </h3>
            <p className="ch-profile-modal-text">
              {isWithinGracePeriod
                ? "Your researcher records and surveys are preserved. Because you are re-activating within 6 months of downgrading, your verified researcher privileges will be instantly restored—no administrator verification required."
                : "Researcher accounts are reviewed and verified by an administrator before you can publish studies, surveys, and schedule workshops."}
            </p>
            <p className="ch-profile-modal-text" style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-teal-800, #115e59)" }}>
              {isWithinGracePeriod
                ? "Confirm your direct phone or WhatsApp contact number:"
                : "Please provide your direct phone or WhatsApp number so an administrator can reach you if further verification is needed:"}
            </p>

            <form onSubmit={handleApplyResearcher}>
              <label className="ch-profile__field" style={{ marginBottom: "14px" }}>
                <span className="ch-profile__label">Phone / WhatsApp Number</span>
                <input
                  type="tel"
                  className="ch-profile__input"
                  placeholder="e.g. +27 82 123 4567"
                  value={applyPhone}
                  onChange={(e) => setApplyPhone(e.target.value)}
                  required
                  autoFocus
                />
              </label>

              {applyError && (
                <p className="ch-profile__error" style={{ marginBottom: "12px" }} role="alert">
                  {applyError}
                </p>
              )}

              <div className="ch-profile-modal-actions">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowApplyModal(false)}
                  disabled={applySubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="accent"
                  disabled={applySubmitting || !applyPhone.trim()}
                >
                  {applySubmitting
                    ? isWithinGracePeriod ? "Restoring…" : "Submitting…"
                    : isWithinGracePeriod ? "Confirm & Re-activate" : "Submit Application"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Downgrade Confirmation Modal */}
      {showDowngradeModal && (
        <div className="ch-profile-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="downgrade-modal-title">
          <div className="ch-profile-modal-card">
            <h3 id="downgrade-modal-title" className="ch-profile-modal-title">
              Switch Back to Community Member?
            </h3>
            <p className="ch-profile-modal-text">
              You will return to a standard Community Member account. All your studies, surveys, and researcher data will be preserved for 6 months but hidden from public view.
            </p>
            <p className="ch-profile-modal-text" style={{ fontSize: "12.5px", color: "var(--color-teal-800, #115e59)", fontWeight: 600, background: "var(--color-surface, #f0fdfa)", padding: "10px 12px", borderRadius: "8px", border: "1px solid #ccfbf1" }}>
               If you apply again within 6 months, you will not need admin re-verification—your account and data will be immediately restored!
            </p>
            {downgradeError && (
              <p className="ch-profile__error" style={{ marginBottom: "12px" }} role="alert">
                {downgradeError}
              </p>
            )}
            <div className="ch-profile-modal-actions">
              <Button
                variant="secondary"
                onClick={() => setShowDowngradeModal(false)}
                disabled={downgradeSubmitting}
              >
                Cancel
              </Button>
              <Button
                variant="secondary"
                className="ch-btn--warning"
                onClick={handleDowngradeToCommunity}
                disabled={downgradeSubmitting}
              >
                {downgradeSubmitting ? "Switching…" : "Yes, Switch to Community Member"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </MobileLayout>
  );
}
