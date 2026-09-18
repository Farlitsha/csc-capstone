import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MobileLayout from "../layouts/MobileLayout";
import StatusChip from "../components/StatusChip";
import Button from "../components/Button";
import Icon from "../components/Icon";
import Spinner from "../components/Spinner";
import { api, ApiError, API_BASE_URL } from "../lib/api";
import { useLanguage } from "../i18n/LanguageContext";
import { useAuth } from "../auth/AuthContext";
import GuestAuthModal from "../components/GuestAuthModal";
import ConfirmModal from "../components/ConfirmModal";
import "./StudiesDirectoryPage.css";

const STATE_TONE = { live: "positive", draft: "neutral", closed: "warning" };
const APPLICATION_TONE = { applied: "neutral", accepted: "positive", declined: "danger", completed: "positive" };

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

export default function StudiesDirectoryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [tab, setTab] = useState("open");

  const [studies, setStudies] = useState([]);
  const [studiesLoading, setStudiesLoading] = useState(true);
  const [studiesError, setStudiesError] = useState("");
  const [applyingId, setApplyingId] = useState(null);
  const [appliedIds, setAppliedIds] = useState([]);

  const [myApplications, setMyApplications] = useState([]);
  const [myAppsLoading, setMyAppsLoading] = useState(true);
  const [myAppsError, setMyAppsError] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [clearingAll, setClearingAll] = useState(false);

  const [guestModalOpen, setGuestModalOpen] = useState(false);
  const [guestModalAction, setGuestModalAction] = useState("");

  const APPLICATION_LABEL = {
    applied: t("studies.statusApplied"),
    accepted: t("studies.statusAccepted"),
    declined: t("studies.statusDeclined"),
    completed: t("studies.statusCompleted") || "Completed",
  };

  function loadData() {
    setStudiesLoading(true);
    setStudiesError("");
    setMyAppsError("");

    const promises = [
      api.listStudies().catch(() => []),
      user ? api.getMyApplications().catch(() => []) : Promise.resolve([]),
    ];

    Promise.all(promises)
      .then(([studiesData, myAppsData]) => {
        setStudies(studiesData);
        setMyApplications(myAppsData);
        if (myAppsData && myAppsData.length > 0) {
          setAppliedIds(myAppsData.map((a) => a.study_id));
        } else {
          setAppliedIds([]);
        }
      })
      .catch(() => setStudiesError("Could not load studies from the server."))
      .finally(() => {
        setStudiesLoading(false);
        setMyAppsLoading(false);
      });
  }

  useEffect(() => {
    loadData();
  }, [user]);

  function loadMyApplications() {
    if (!user) {
      setMyAppsLoading(false);
      return;
    }
    setMyAppsLoading(true);
    api
      .getMyApplications()
      .then((data) => {
        setMyApplications(data);
        if (data && data.length > 0) {
          setAppliedIds(data.map((a) => a.study_id));
        } else {
          setAppliedIds([]);
        }
      })
      .catch(() => setMyAppsError("Could not load your applications."))
      .finally(() => setMyAppsLoading(false));
  }

  async function handleApply(studyId) {
    if (!user) {
      setGuestModalAction("apply to participate in research studies");
      setGuestModalOpen(true);
      return;
    }
    setApplyingId(studyId);
    try {
      await api.applyToStudy(studyId);
      setAppliedIds((prev) => [...prev, studyId]);
      loadMyApplications();
    } catch (err) {
      alert(err instanceof ApiError ? err.detail : "Could not apply to this study.");
    } finally {
      setApplyingId(null);
    }
  }

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    confirmText: "Confirm",
    cancelText: "Cancel",
    variant: "danger",
    icon: "alert-triangle",
    onConfirm: null,
  });

  function openConfirm(config) {
    setConfirmModal({
      isOpen: true,
      title: config.title || "Are you sure?",
      message: config.message || "",
      confirmText: config.confirmText || "Confirm",
      cancelText: config.cancelText || "Cancel",
      variant: config.variant || "danger",
      icon: config.icon || "alert-triangle",
      onConfirm: config.onConfirm,
    });
  }

  function closeConfirm() {
    setConfirmModal((prev) => ({ ...prev, isOpen: false }));
  }

  function handleUnapply(studyId) {
    openConfirm({
      title: t("studies.unapply") || "Unapply from Study",
      message: t("studies.unapplyConfirm") || "Are you sure you want to unapply and withdraw your application from this research study?",
      confirmText: t("studies.unapply") || "Yes, Unapply",
      variant: "danger",
      icon: "user-minus",
      onConfirm: () => performUnapply(studyId),
    });
  }

  async function performUnapply(studyId) {
    closeConfirm();
    setActionLoadingId(studyId);
    setAppliedIds((prev) => prev.filter((id) => id !== studyId));
    setMyApplications((prev) => prev.filter((a) => a.study_id !== studyId));

    try {
      await api.unapplyFromStudy(studyId);
      loadMyApplications();
    } catch (err) {
      alert(err instanceof ApiError ? err.detail : "Could not withdraw application.");
      loadData();
    } finally {
      setActionLoadingId(null);
    }
  }

  function handleClearCompleted(studyId) {
    openConfirm({
      title: t("studies.clearSurvey") || "Clear Completed Survey",
      message: t("studies.clearConfirm") || "Are you sure you want to clear this completed survey and remove it from your history?",
      confirmText: t("studies.clearSurvey") || "Yes, Clear Survey",
      variant: "danger",
      icon: "trash",
      onConfirm: () => performClearCompleted(studyId),
    });
  }

  async function performClearCompleted(studyId) {
    closeConfirm();
    setActionLoadingId(studyId);
    setAppliedIds((prev) => prev.filter((id) => id !== studyId));
    setMyApplications((prev) => prev.filter((a) => a.study_id !== studyId));

    try {
      await api.clearSurveyResponse(studyId);
      loadMyApplications();
    } catch (err) {
      alert(err instanceof ApiError ? err.detail : "Could not clear survey response.");
      loadData();
    } finally {
      setActionLoadingId(null);
    }
  }

  function handleClearAllCompleted() {
    openConfirm({
      title: t("studies.clearAllCompleted") || "Clear All Completed Surveys",
      message: t("studies.clearAllConfirm") || "Are you sure you want to clear all completed surveys from your history?",
      confirmText: t("studies.clearAllCompleted") || "Yes, Clear All",
      variant: "danger",
      icon: "trash",
      onConfirm: performClearAllCompleted,
    });
  }

  async function performClearAllCompleted() {
    closeConfirm();
    setClearingAll(true);
    try {
      await api.clearAllCompletedSurveys();
      loadData();
    } catch (err) {
      alert(err instanceof ApiError ? err.detail : "Could not clear completed surveys.");
    } finally {
      setClearingAll(false);
    }
  }


  async function handleDeleteApplication(appId, studyId) {
    setActionLoadingId(appId);
    try {
      await api.deleteApplication(appId);
      if (studyId) {
        setAppliedIds((prev) => prev.filter((id) => id !== studyId));
      }
      setMyApplications((prev) => prev.filter((a) => a.id !== appId));
      loadMyApplications();
    } catch (err) {
      alert(err instanceof ApiError ? err.detail : "Could not remove application.");
    } finally {
      setActionLoadingId(null);
    }
  }

  const liveStudies = [...studies]
    .filter((s) => s.state === "live")
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const completedCount = myApplications.filter((a) => a.has_submitted_survey).length;

  return (
    <MobileLayout title={t("studies.title")} onBack={() => navigate(-1)}>
      {/* Top Main Tabs: Open Studies vs My Applications vs Workshops */}
      <div className="ch-service-tabs-row" role="tablist" aria-label="Studies navigation views">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "open"}
          className={`ch-service-tab-btn ${tab === "open" ? "ch-service-tab-btn--active" : ""}`}
          onClick={() => setTab("open")}
        >
          <Icon name="clipboard" size={14} style={{ marginRight: 6 }} />
          {t("studies.openTab")} ({liveStudies.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "mine"}
          className={`ch-service-tab-btn ${tab === "mine" ? "ch-service-tab-btn--active" : ""}`}
          onClick={() => setTab("mine")}
        >
          <Icon name="user-check" size={14} style={{ marginRight: 6 }} />
          {t("studies.myAppsTab")} ({user ? myApplications.length : 0})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={false}
          className="ch-service-tab-btn"
          onClick={() => navigate("/workshops")}
        >
          <Icon name="calendar" size={14} style={{ marginRight: 6 }} />
          Workshops
        </button>
      </div>

      {/* Screen-reader live region announcing tab and study count updates */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {tab === "open"
          ? (!studiesLoading && !studiesError && `${liveStudies.length} open research ${liveStudies.length === 1 ? "study" : "studies"} available`)
          : (!myAppsLoading && !myAppsError && `${myApplications.length} active ${myApplications.length === 1 ? "application" : "applications"}`)}
      </div>

      {tab === "open" && (
        <div className="ch-studies-list">
          {studiesLoading && <Spinner />}
          {studiesError && <p className="ch-studies-empty ch-studies-empty--error" role="alert">{studiesError}</p>}
          {!studiesLoading && !studiesError && liveStudies.length === 0 && (
            <p className="ch-studies-empty">{t("studies.noOpen")}</p>
          )}

          {liveStudies.map((s) => {
            const applied = appliedIds.includes(s.id);

            return (
              <div className="ch-study-card" key={s.id}>
                <div className="ch-study-card__header-row">
                  <StatusChip label={s.state} tone={STATE_TONE[s.state] || "neutral"} />
                  {s.created_at && (
                    <span className="ch-study-card__header-date">
                      {new Date(s.created_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <h3>{s.title}</h3>
                <div className="ch-poster-row">
                  {avatarSrc(s.researcher_avatar_url) ? (
                    <img
                      className="ch-poster-avatar"
                      src={avatarSrc(s.researcher_avatar_url)}
                      alt={s.researcher_display_name || s.researcher_username}
                    />
                  ) : (
                    <span className="ch-poster-avatar ch-poster-avatar--initials">
                      {getInitials(s.researcher_display_name, s.researcher_username)}
                    </span>
                  )}
                  <span className="ch-poster-name">
                    {s.researcher_display_name || s.researcher_username}
                  </span>
                </div>
                <p>{s.description}</p>
                <div className="ch-study-card__meta">
                  {s.honorarium && <span>{s.honorarium}</span>}
                  {s.participant_limit && <span>{t("studies.limit")} {s.participant_limit} {t("studies.participants")}</span>}
                  {s.closing_date && <span>{t("studies.closes")} {new Date(s.closing_date).toLocaleDateString()}</span>}
                </div>

                {applied ? (
                  <div className="ch-study-card__applied-box">
                    <span className="ch-study-card__applied-label">
                      <Icon name="check" size={14} style={{ marginRight: 4 }} />
                      {t("studies.applied")}
                    </span>
                    <Button
                      variant="danger-outline"
                      className="ch-study-card__unapply-btn"
                      disabled={actionLoadingId === s.id}
                      onClick={() => handleUnapply(s.id)}
                    >
                      <Icon name="x" size={13} style={{ marginRight: 4 }} />
                      {actionLoadingId === s.id ? t("studies.unapplying") : t("studies.unapply")}
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="accent"
                    fullWidth
                    disabled={applyingId === s.id}
                    onClick={() => handleApply(s.id)}
                  >
                    {applyingId === s.id ? t("studies.applying") : t("studies.applyButton")}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {tab === "mine" && (
        <div className="ch-studies-list">
          {!user ? (
            <div style={{ textAlign: "center", padding: "32px 16px" }}>
              <p style={{ color: "var(--color-sage)", fontSize: "14px", marginBottom: "14px" }}>
                You are browsing as a guest. Create an account or log in to track your study applications.
              </p>
              <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                <Button variant="accent" onClick={() => navigate("/signup")}>
                  Create Free Account
                </Button>
                <Button variant="secondary" onClick={() => navigate("/login")}>
                  Log In
                </Button>
              </div>
            </div>
          ) : (
            <>
              {completedCount > 1 && (
                <div className="ch-studies-batch-bar">
                  <span className="ch-studies-batch-text">
                    <Icon name="check-circle" size={15} style={{ marginRight: 6, color: "var(--color-positive)" }} />
                    <strong>{completedCount}</strong> completed surveys
                  </span>
                  <button
                    type="button"
                    className="ch-studies-batch-clear-btn"
                    disabled={clearingAll}
                    onClick={handleClearAllCompleted}
                  >
                    <Icon name="trash" size={13} style={{ marginRight: 4 }} />
                    {clearingAll ? t("studies.clearing") : t("studies.clearAllCompleted")}
                  </button>
                </div>
              )}

              {myAppsLoading && <Spinner />}
              {myAppsError && <p className="ch-studies-empty ch-studies-empty--error" role="alert">{myAppsError}</p>}
              {!myAppsLoading && !myAppsError && myApplications.length === 0 && (
                <p className="ch-studies-empty">{t("studies.noApplications")}</p>
              )}

              {myApplications.map((a) => {
                const isCompleted = a.has_submitted_survey;
                const statusKey = isCompleted ? "completed" : a.status;

                return (
                  <div className="ch-study-card" key={a.id}>
                    <div className="ch-study-card__header-row">
                      <StatusChip
                        label={isCompleted ? (t("studies.statusCompleted") || "Completed") : (APPLICATION_LABEL[a.status] || a.status)}
                        tone={APPLICATION_TONE[statusKey] || "neutral"}
                      />
                      <span className="ch-study-card__header-date">
                        {new Date(a.applied_at).toLocaleDateString()}
                      </span>
                    </div>

                    <h3>{a.study_title}</h3>

                    {isCompleted && (
                      <div className="ch-study-completed-badge">
                        <Icon name="check-circle" size={15} />
                        <span>{t("studies.surveyCompleted")}</span>
                      </div>
                    )}

                    <div className="ch-study-card__meta">
                      {a.study_honorarium && <span>{a.study_honorarium}</span>}
                      <span>{t("studies.appliedOn")} {new Date(a.applied_at).toLocaleDateString()}</span>
                    </div>

                    {/* Action buttons depending on application status & completion */}
                    {isCompleted && (
                      <Button
                        variant="secondary"
                        fullWidth
                        disabled={actionLoadingId === a.study_id}
                        onClick={() => handleClearCompleted(a.study_id)}
                      >
                        <Icon name="trash" size={14} style={{ marginRight: 6 }} />
                        {actionLoadingId === a.study_id ? t("studies.clearing") : t("studies.clearSurvey")}
                      </Button>
                    )}

                    {!isCompleted && a.status === "applied" && (
                      <Button
                        variant="danger-outline"
                        fullWidth
                        disabled={actionLoadingId === a.study_id}
                        onClick={() => handleUnapply(a.study_id)}
                      >
                        <Icon name="user-minus" size={14} style={{ marginRight: 6 }} />
                        {actionLoadingId === a.study_id ? t("studies.unapplying") : t("studies.unapply")}
                      </Button>
                    )}

                    {!isCompleted && a.status === "accepted" && (
                      <div className="ch-study-card__button-group">
                        <Button
                          variant="accent"
                          className="ch-study-card__take-btn"
                          onClick={() => navigate(`/studies/${a.study_id}/survey`)}
                        >
                          <Icon name="clipboard" size={14} style={{ marginRight: 6 }} />
                          {t("studies.takeSurvey")}
                        </Button>
                        <Button
                          variant="danger-outline"
                          className="ch-study-card__withdraw-btn"
                          disabled={actionLoadingId === a.study_id}
                          onClick={() => handleUnapply(a.study_id)}
                        >
                          {actionLoadingId === a.study_id ? t("studies.unapplying") : t("studies.unapply")}
                        </Button>
                      </div>
                    )}

                    {!isCompleted && a.status === "declined" && (
                      <Button
                        variant="secondary"
                        fullWidth
                        disabled={actionLoadingId === a.id}
                        onClick={() => handleDeleteApplication(a.id, a.study_id)}
                      >
                        <Icon name="x" size={14} style={{ marginRight: 6 }} />
                        {t("studies.dismiss")}
                      </Button>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      <GuestAuthModal
        isOpen={guestModalOpen}
        onClose={() => setGuestModalOpen(false)}
        actionName={guestModalAction}
      />

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={closeConfirm}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        variant={confirmModal.variant}
        icon={confirmModal.icon}
      />
    </MobileLayout>
  );
}

