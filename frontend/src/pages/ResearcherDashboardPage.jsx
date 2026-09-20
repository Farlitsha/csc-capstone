import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DesktopLayout from "../layouts/DesktopLayout";
import StatCard from "../components/StatCard";
import StatusChip from "../components/StatusChip";
import Button from "../components/Button";
import Card from "../components/Card";
import Field from "../components/Field";
import Icon from "../components/Icon";
import ConfirmModal from "../components/ConfirmModal";
import { api, ApiError } from "../lib/api";
import { useCacheSync } from "../lib/cache";
import { useAuth } from "../auth/AuthContext";
import { useLanguage } from "../i18n/LanguageContext";
import "./ResearcherDashboardPage.css";

const STATE_TONE = { live: "positive", draft: "neutral", closed: "warning", scheduled: "positive", cancelled: "warning", completed: "neutral" };

export default function ResearcherDashboardPage() {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const locale = { en: "en-ZA", af: "af-ZA", xh: "xh-ZA", zu: "zu-ZA" }[lang] || "en-ZA";
  const [profile, setProfile] = useState(null);
  const [studies, setStudies] = useState([]);
  const [workshops, setWorkshops] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // Workshop Scheduling Modal
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [workshopForm, setWorkshopForm] = useState({
    title: "",
    description: "",
    location: "",
    date_time: "",
    max_participants: 15,
  });
  const [workshopSubmitting, setWorkshopSubmitting] = useState(false);
  const [workshopError, setWorkshopError] = useState("");

  // Attendees Modal
  const [selectedWorkshop, setSelectedWorkshop] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [attendeesLoading, setAttendeesLoading] = useState(false);

  function loadData() {
    setLoading(true);
    api
      .me()
      .catch(() => null)
      .then(async (meData) => {
        if (meData) setProfile(meData);
        const currentUserId = meData?.id || user?.id;

        try {
          const [studiesData, workshopsData] = await Promise.all([
            api.listStudies(
              currentUserId
                ? { researcher_id: currentUserId, include_closed: true }
                : { include_closed: true }
            ).catch(() => []),
            api.listWorkshops(true, currentUserId || null).catch(() => []),
          ]);

          // Strictly filter so researcher only sees their own work (defense-in-depth)
          const myStudies = currentUserId
            ? (studiesData || []).filter((s) => s.researcher_id === currentUserId)
            : (studiesData || []);
          const myWorkshops = currentUserId
            ? (workshopsData || []).filter((w) => w.organizer_id === currentUserId)
            : (workshopsData || []);

          setStudies(myStudies);
          setWorkshops(myWorkshops);
        } catch {
          setError(t("researcherDashboard.loadError"));
        }
      })
      .catch(() => setError(t("researcherDashboard.loadError")))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadData();
  }, [user?.id]);

  useCacheSync("^/(studies|workshops)", () => {
    loadData();
  });

  const isPendingVerification = profile?.verification_status === "pending";
  const isRejected = profile?.verification_status === "rejected";
  const isVerified = profile?.verification_status === "verified" || profile?.role === "admin";

  const liveCount = studies.filter((s) => s.state === "live").length;
  const activeWorkshops = workshops.filter((w) => w.status === "scheduled");

  async function handleCreateWorkshop(e) {
    e.preventDefault();
    setWorkshopError("");
    if (!workshopForm.date_time) {
      setWorkshopError(t("researcherDashboard.selectDateTime"));
      return;
    }
    const chosenDate = new Date(workshopForm.date_time);
    if (chosenDate <= new Date()) {
      setWorkshopError(t("researcherDashboard.futureDateTime"));
      return;
    }
    setWorkshopSubmitting(true);
    try {
      await api.createWorkshop({
        ...workshopForm,
        date_time: chosenDate.toISOString(),
        max_participants: parseInt(workshopForm.max_participants, 10),
      });
      setShowScheduleModal(false);
      setWorkshopForm({ title: "", description: "", location: "", date_time: "", max_participants: 15 });
      loadData();
    } catch (err) {
      setWorkshopError(err instanceof ApiError ? err.detail : t("researcherDashboard.createWorkshopError"));
    } finally {
      setWorkshopSubmitting(false);
    }
  }

  async function handleViewAttendees(workshop) {
    setSelectedWorkshop(workshop);
    setAttendeesLoading(true);
    try {
      const data = await api.getWorkshopRegistrations(workshop.id);
      setAttendees(data);
    } catch (err) {
      alert(t("researcherDashboard.attendeesError"));
    } finally {
      setAttendeesLoading(false);
    }
  }

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    confirmText: t("adminDashboard.confirm"),
    cancelText: t("common.cancel"),
    variant: "danger",
    icon: "alert-triangle",
    loading: false,
    onConfirm: null,
  });

  function openConfirm(config) {
    setConfirmModal({
      isOpen: true,
      title: config.title || t("researcherDashboard.areYouSure"),
      message: config.message || "",
      confirmText: config.confirmText || t("adminDashboard.confirm"),
      cancelText: config.cancelText || t("common.cancel"),
      variant: config.variant || "danger",
      icon: config.icon || "alert-triangle",
      loading: false,
      onConfirm: config.onConfirm,
    });
  }

  function closeConfirm() {
    setConfirmModal((prev) => ({ ...prev, isOpen: false }));
  }

  function handleCancelWorkshop(workshopId) {
    openConfirm({
      title: t("researcherDashboard.cancelWorkshopTitle"),
      message: t("researcherDashboard.cancelWorkshopConfirm"),
      confirmText: t("researcherDashboard.cancelWorkshopButton"),
      variant: "warning",
      icon: "calendar",
      onConfirm: async () => {
        closeConfirm();
        try {
          await api.cancelWorkshop(workshopId);
          loadData();
        } catch (err) {
          alert(err instanceof ApiError ? err.detail : t("researcherDashboard.cancelWorkshopError"));
        }
      },
    });
  }

  function handleDeleteWorkshop(workshopId) {
    openConfirm({
      title: t("researcherDashboard.deleteWorkshopTitle"),
      message: t("researcherDashboard.deleteWorkshopConfirm"),
      confirmText: t("researcherDashboard.deleteButton"),
      variant: "danger",
      icon: "trash",
      onConfirm: async () => {
        closeConfirm();
        try {
          await api.deleteWorkshop(workshopId);
          setWorkshops((prev) => prev.filter((w) => w.id !== workshopId));
        } catch (err) {
          alert(err instanceof ApiError ? err.detail : t("researcherDashboard.deleteWorkshopError"));
        }
      },
    });
  }

  // Edit Study State & Handlers
  const [editingStudy, setEditingStudy] = useState(null);
  const [editStudyForm, setEditStudyForm] = useState({ title: "", description: "", honorarium: "", participant_limit: "" });
  const [editStudySaving, setEditStudySaving] = useState(false);
  const [editStudyError, setEditStudyError] = useState("");

  function startEditStudy(study) {
    setEditingStudy(study);
    setEditStudyForm({
      title: study.title || "",
      description: study.description || "",
      honorarium: study.honorarium || "",
      participant_limit: study.participant_limit !== null && study.participant_limit !== undefined ? String(study.participant_limit) : "",
    });
    setEditStudyError("");
  }

  async function handleSaveEditStudy(e) {
    e.preventDefault();
    if (!editStudyForm.title.trim() || !editStudyForm.description.trim()) {
      setEditStudyError(t("researcherDashboard.titleDescriptionRequired"));
      return;
    }
    setEditStudySaving(true);
    setEditStudyError("");
    try {
      const updated = await api.updateStudy(editingStudy.id, {
        title: editStudyForm.title.trim(),
        description: editStudyForm.description.trim(),
        honorarium: editStudyForm.honorarium.trim() || undefined,
        participant_limit: editStudyForm.participant_limit ? parseInt(editStudyForm.participant_limit, 10) : undefined,
      });
      setStudies((prev) => prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s)));
      setEditingStudy(null);
    } catch (err) {
      setEditStudyError(err instanceof ApiError ? err.detail : t("researcherDashboard.updateStudyError"));
    } finally {
      setEditStudySaving(false);
    }
  }

  function handleDeleteStudy(study) {
    openConfirm({
      title: t("researcherDashboard.deleteStudyTitle"),
      message: `${t("researcherDashboard.deleteStudyConfirmStart")} "${study.title}"? ${t("researcherDashboard.deleteStudyConfirmEnd")}`,
      confirmText: t("researcherDashboard.deleteStudyButton"),
      variant: "danger",
      icon: "trash",
      onConfirm: async () => {
        closeConfirm();
        try {
          await api.deleteStudy(study.id);
          setStudies((prev) => prev.filter((s) => s.id !== study.id));
        } catch (err) {
          alert(err instanceof ApiError ? err.detail : t("researcherDashboard.deleteStudyError"));
        }
      },
    });
  }



  return (
    <DesktopLayout
      eyebrow={t("researcherDashboard.workspace")}
      rightSlot={
        <div style={{ display: "flex", gap: "10px" }}>
          <Button
            variant="accent"
            disabled={!isVerified}
            onClick={() => setShowScheduleModal(true)}
          >
            + {t("researcherDashboard.scheduleWorkshop")}
          </Button>
          <Button
            variant="secondary"
            disabled={!isVerified}
            onClick={() => navigate("/researcher/studies/new")}
          >
            + {t("researcherDashboard.newStudy")}
          </Button>
        </div>
      }
    >
      <div className="ch-desktop__heading">
        <h1>{t("researcherDashboard.greeting")}, {profile?.display_name || user?.username || t("researcherDashboard.researcher")}</h1>
      </div>

      {isPendingVerification && (
        <div style={{
          background: "#fef3c7",
          border: "1px solid #f59e0b",
          color: "#92400e",
          padding: "16px 20px",
          borderRadius: "8px",
          marginBottom: "20px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
        }}>
          <Icon name="info" size={24} />
          <div>
            <strong>{t("researcherDashboard.pendingTitle")}</strong>
            <p style={{ margin: "4px 0 0 0", fontSize: "14px" }}>
              {t("researcherDashboard.pendingText")}
            </p>
          </div>
        </div>
      )}

      {isRejected && (
        <div style={{
          background: "#fee2e2",
          border: "1px solid #ef4444",
          color: "#991b1b",
          padding: "16px 20px",
          borderRadius: "8px",
          marginBottom: "20px",
        }}>
          <strong>{t("researcherDashboard.rejectedTitle")}</strong>
          <p style={{ margin: "4px 0 0 0", fontSize: "14px" }}>
            {t("researcherDashboard.rejectedText")}
          </p>
        </div>
      )}

      <div className="ch-stats-row">
        <StatCard label={t("researcherDashboard.liveStudies")} value={String(liveCount)} />
        <StatCard label={t("researcherDashboard.scheduledWorkshops")} value={String(activeWorkshops.length)} />
        <StatCard label={t("researcherDashboard.totalAttendees")} value={String(workshops.reduce((acc, w) => acc + (w.registered_count || 0), 0))} />
        <StatCard label={t("researcherDashboard.verification")} value={t(`researcherDashboard.status.${profile?.verification_status || "pending"}`)} />
      </div>

      <Card title={t("researcherDashboard.workshopsTitle")}>
        {loading && <p className="ch-dash-empty">{t("researcherDashboard.loadingWorkshops")}</p>}
        {!loading && workshops.length === 0 && (
          <p className="ch-dash-empty">{t("researcherDashboard.noWorkshops")}</p>
        )}
        {workshops.map((w) => {
          const wDate = new Date(w.date_time);
          return (
            <div className="ch-row" key={w.id}>
              <div>
                <p className="ch-row__title">{w.title}</p>
                <p className="ch-row__meta" style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", margin: "4px 0 0 0" }}>
                  <span><Icon name="calendar" size={13} style={{ marginRight: 4 }} />{wDate.toLocaleDateString(locale)} {t("researcherDashboard.at")} {wDate.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}</span>
                  <span>•</span>
                  <span><Icon name="location" size={13} style={{ marginRight: 4 }} />{w.location}</span>
                  <span>•</span>
                  <span><Icon name="users" size={13} style={{ marginRight: 4 }} />{w.registered_count} / {w.max_participants} {t("researcherDashboard.booked")}</span>
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Button variant="secondary" onClick={() => handleViewAttendees(w)}>
                  {t("researcherDashboard.attendees")} ({w.registered_count || 0})
                </Button>
                {w.status === "scheduled" && (
                  <Button variant="secondary" className="ch-btn-danger" onClick={() => handleCancelWorkshop(w.id)}>
                    {t("common.cancel")}
                  </Button>
                )}
                <Button variant="secondary" className="ch-btn-danger" onClick={() => handleDeleteWorkshop(w.id)}>
                  {t("common.delete")}
                </Button>
                <StatusChip label={t(`researcherDashboard.status.${w.status}`)} tone={STATE_TONE[w.status] || "neutral"} />
              </div>
            </div>
          );
        })}
      </Card>

      <Card title={t("researcherDashboard.studiesTitle")}>
        {loading && <p className="ch-dash-empty">{t("common.loading")}</p>}
        {error && <p className="ch-dash-empty ch-dash-empty--error">{error}</p>}
        {!loading && !error && studies.length === 0 && (
          <p className="ch-dash-empty">{t("researcherDashboard.noStudies")}</p>
        )}
        {studies.map((s) => (
          <div className="ch-row" key={s.id}>
            <div>
              <p className="ch-row__title">{s.title}</p>
              <p className="ch-row__meta">
                {s.participant_limit ? `${t("researcherDashboard.limit")} ${s.participant_limit}` : t("researcherDashboard.noLimit")}
                {s.honorarium ? ` · ${s.honorarium}` : ""}
                {s.response_count !== undefined && (
                  s.response_count > 0 ? (
                    <span style={{ marginLeft: 8, color: "#991b1b", fontWeight: 600 }}>
                      · {s.response_count} response{s.response_count === 1 ? "" : "s"} (Questions locked)
                    </span>
                  ) : (
                    <span style={{ marginLeft: 8, color: "#047857", fontWeight: 600 }}>
                      · 0 responses (Questions editable)
                    </span>
                  )
                )}
              </p>
            </div>
            <div className="ch-study-row-actions" style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <Button variant="secondary" onClick={() => navigate(`/researcher/studies/${s.id}/applicants`)}>
                {t("researcherDashboard.applicants")}
              </Button>
              <Button variant="secondary" onClick={() => navigate(`/researcher/studies/${s.id}/responses`)}>
                {t("researcherDashboard.surveyResponses")}
              </Button>
              <Button variant="secondary" onClick={() => navigate(`/researcher/studies/${s.id}/edit`)}>
                <Icon name="edit" size={13} style={{ marginRight: 4 }} />
                {t("common.edit")}
              </Button>
              <Button variant="secondary" className="ch-btn-danger" onClick={() => handleDeleteStudy(s)}>
                {t("common.delete")}
              </Button>
              <StatusChip label={t(`researcherDashboard.status.${s.state}`)} tone={STATE_TONE[s.state] || "neutral"} />
            </div>
          </div>
        ))}
      </Card>


      {/* Schedule Workshop Modal */}
      {showScheduleModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: "20px",
        }}>
          <div style={{
            background: "#fff",
            borderRadius: "12px",
            width: "100%",
            maxWidth: "520px",
            padding: "24px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
          }}>
            <h2 style={{ marginTop: 0, marginBottom: "16px" }}>{t("researcherDashboard.scheduleModalTitle")}</h2>
            <form onSubmit={handleCreateWorkshop}>
              <Field
                label={t("researcherDashboard.workshopTitle")}
                id="w_title"
                value={workshopForm.title}
                onChange={(e) => setWorkshopForm((f) => ({ ...f, title: e.target.value }))}
                required
              />
              <Field
                label={t("researcherDashboard.descriptionAgenda")}
                id="w_desc"
                as="textarea"
                value={workshopForm.description}
                onChange={(e) => setWorkshopForm((f) => ({ ...f, description: e.target.value }))}
                required
              />
              <Field
                label={t("researcherDashboard.location")}
                id="w_loc"
                value={workshopForm.location}
                onChange={(e) => setWorkshopForm((f) => ({ ...f, location: e.target.value }))}
                required
              />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                <div>
                  <label className="ch-field__label" htmlFor="w_dt">{t("researcherDashboard.dateTime")}</label>
                  <input
                    id="w_dt"
                    type="datetime-local"
                    className="ch-field__input"
                    value={workshopForm.date_time}
                    onChange={(e) => setWorkshopForm((f) => ({ ...f, date_time: e.target.value }))}
                    style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #ccc" }}
                    required
                  />
                </div>
                <div>
                  <label className="ch-field__label" htmlFor="w_max">{t("researcherDashboard.maxParticipants")}</label>
                  <input
                    id="w_max"
                    type="number"
                    min="1"
                    className="ch-field__input"
                    value={workshopForm.max_participants}
                    onChange={(e) => setWorkshopForm((f) => ({ ...f, max_participants: e.target.value }))}
                    style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #ccc" }}
                    required
                  />
                </div>
              </div>

              {workshopError && <p className="ch-login__error" style={{ color: "#dc2626", marginBottom: "12px" }}>{workshopError}</p>}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
                <Button variant="secondary" onClick={() => setShowScheduleModal(false)}>
                  {t("common.cancel")}
                </Button>
                <Button type="submit" variant="accent" disabled={workshopSubmitting}>
                  {workshopSubmitting ? t("researcherDashboard.scheduling") : t("researcherDashboard.confirmSchedule")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Attendees Modal */}
      {selectedWorkshop && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: "20px",
        }}>
          <div style={{
            background: "#fff",
            borderRadius: "12px",
            width: "100%",
            maxWidth: "500px",
            padding: "24px",
            maxHeight: "80vh",
            overflowY: "auto",
          }}>
            <h2 style={{ marginTop: 0, marginBottom: "8px" }}>{t("researcherDashboard.registeredAttendees")}</h2>
            <p style={{ color: "#666", marginBottom: "16px" }}>{selectedWorkshop.title}</p>

            {attendeesLoading && <p>{t("researcherDashboard.loadingParticipants")}</p>}
            {!attendeesLoading && attendees.length === 0 && (
              <p className="ch-dash-empty">{t("researcherDashboard.noAttendees")}</p>
            )}

            {!attendeesLoading && attendees.map((a) => (
              <div key={a.id} className="ch-row" style={{ padding: "10px 0", borderBottom: "1px solid #eee" }}>
                <div>
                  <p className="ch-row__title">{a.participant_display_name || a.participant_username}</p>
                  <p className="ch-row__meta">@{a.participant_username} • {t("researcherDashboard.registered")} {new Date(a.registered_at).toLocaleDateString(locale)}</p>
                </div>
                <StatusChip label={t("researcherDashboard.registered")} tone="positive" />
              </div>
            ))}

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "20px" }}>
              <Button variant="secondary" onClick={() => setSelectedWorkshop(null)}>
                {t("common.close")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Study Modal */}
      {editingStudy && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: "20px",
        }}>
          <div style={{
            background: "#fff",
            borderRadius: "12px",
            width: "100%",
            maxWidth: "520px",
            padding: "24px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
          }}>
            <h2 style={{ marginTop: 0, marginBottom: "16px" }}>{t("researcherDashboard.editStudyTitle")}</h2>
            <form onSubmit={handleSaveEditStudy}>
              {editStudyError && <p style={{ color: "#dc2626", marginBottom: "12px" }}>{editStudyError}</p>}
              <Field
                label={t("researcherDashboard.studyTitle")}
                id="edit_study_title"
                value={editStudyForm.title}
                onChange={(e) => setEditStudyForm((f) => ({ ...f, title: e.target.value }))}
                required
              />
              <Field
                label={t("researcherDashboard.studyDescription")}
                id="edit_study_desc"
                as="textarea"
                value={editStudyForm.description}
                onChange={(e) => setEditStudyForm((f) => ({ ...f, description: e.target.value }))}
                required
              />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <Field
                  label={t("researcherDashboard.honorarium")}
                  id="edit_study_hon"
                  value={editStudyForm.honorarium}
                  onChange={(e) => setEditStudyForm((f) => ({ ...f, honorarium: e.target.value }))}
                />
                <Field
                  label={t("researcherDashboard.participantLimit")}
                  id="edit_study_limit"
                  type="number"
                  min="1"
                  value={editStudyForm.participant_limit}
                  onChange={(e) => setEditStudyForm((f) => ({ ...f, participant_limit: e.target.value }))}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
                <Button variant="secondary" onClick={() => setEditingStudy(null)}>
                  {t("common.cancel")}
                </Button>
                <Button type="submit" variant="accent" disabled={editStudySaving}>
                  {editStudySaving ? t("researcherDashboard.saving") : t("researcherDashboard.saveChanges")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

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
    </DesktopLayout>
  );
}


