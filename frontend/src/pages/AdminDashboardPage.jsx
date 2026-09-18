import { useEffect, useState } from "react";
import DesktopLayout from "../layouts/DesktopLayout";
import StatCard from "../components/StatCard";
import StatusChip from "../components/StatusChip";
import Button from "../components/Button";
import Card from "../components/Card";
import Field from "../components/Field";
import Chip from "../components/Chip";
import Icon from "../components/Icon";
import { useAuth } from "../auth/AuthContext";
import { useLanguage } from "../i18n/LanguageContext";
import { api, ApiError } from "../lib/api";
import "./AdminDashboardPage.css";

const ROLES = ["community_member", "researcher", "admin"];

const TARGET_ICONS = {
  service: "tools",
  study: "document",
  user: "user",
};

export default function AdminDashboardPage() {
  const { user: currentUser } = useAuth();
  const { lang, t } = useLanguage();
  const locale = { en: "en-ZA", af: "af-ZA", xh: "xh-ZA", zu: "zu-ZA" }[lang] || "en-ZA";
  const roleLabel = {
    community_member: t("adminDashboard.roles.communityMember"),
    researcher: t("adminDashboard.roles.researcher"),
    admin: t("adminDashboard.roles.admin"),
  };
  const audienceOptions = [
    { value: "All members", label: t("adminDashboard.allMembers") },
    { value: "Researchers", label: t("adminDashboard.researchersAudience") },
    { value: "Admins only", label: t("adminDashboard.adminsOnly") },
  ];

  // Data states
  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [pendingResearchers, setPendingResearchers] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [stats, setStats] = useState({
    total_users: 0,
    researchers: 0,
    admins: 0,
    community_members: 0,
    flagged_listings: 0,
    total_services: 0,
    total_studies: 0,
    total_workshops: 0,
    total_workshop_registrations: 0,
  });

  // UI Navigation & Filters
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("all");
  const [reportStatusFilter, setReportStatusFilter] = useState("open");

  // Action progress states
  const [updatingId, setUpdatingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [verifyingId, setVerifyingId] = useState(null);
  const [actioningReportId, setActioningReportId] = useState(null);
  const [deletingAnnouncementId, setDeletingAnnouncementId] = useState(null);

  // Announcement compose form
  const [audience, setAudience] = useState("All members");
  const [announcementContent, setAnnouncementContent] = useState("");
  const [sendingAnnouncement, setSendingAnnouncement] = useState(false);

  // In-app Toast feedback
  const [toast, setToast] = useState(null);

  // In-app Confirmation Modal
  const [confirmDialog, setConfirmDialog] = useState(null);

  function showToast(message, type = "success") {
    setToast({ message, type });
  }

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(timer);
  }, [toast]);

  function loadData(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    Promise.all([
      api.listUsers(0, 100).catch(() => []),
      api.listReports().catch(() => []),
      api.listPendingResearchers().catch(() => []),
      api.listAnnouncements().catch(() => []),
      api.listAuditLogs(0, 50).catch(() => []),
      api.getAdminStats().catch(() => null),
    ])
      .then(([usersData, reportsData, pendingData, annData, auditData, statsData]) => {
        setUsers(usersData);
        setReports(reportsData);
        setPendingResearchers(pendingData);
        setAnnouncements(annData);
        setAuditLogs(auditData);

        if (statsData) {
          setStats(statsData);
        } else {
          setStats({
            total_users: usersData.length,
            researchers: usersData.filter((u) => u.role === "researcher").length,
            admins: usersData.filter((u) => u.role === "admin").length,
            community_members: usersData.filter((u) => u.role === "community_member").length,
            flagged_listings: reportsData.filter((r) => r.status === "open").length,
            total_services: 0,
            total_studies: 0,
          });
        }
      })
      .catch((err) => {
        showToast(t("adminDashboard.loadError"), "error");
      })
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  }

  useEffect(() => {
    loadData();
  }, []);

  // Handlers
  async function handleRoleChange(userId, newRole) {
    setUpdatingId(userId);
    try {
      const updated = await api.updateUserRole(userId, newRole);
      setUsers((list) => list.map((u) => (u.id === userId ? updated : u)));
      showToast(`${t("adminDashboard.roleUpdated")} ${roleLabel[newRole] || newRole}.`);
      loadData(true);
    } catch (err) {
      showToast(err instanceof ApiError ? err.detail : t("adminDashboard.roleUpdateError"), "error");
    } finally {
      setUpdatingId(null);
    }
  }

  function promptDeleteUser(user) {
    if (currentUser?.id === user.id) {
      showToast(t("adminDashboard.cannotDeleteSelf"), "error");
      return;
    }
    setConfirmDialog({
      title: t("adminDashboard.deleteUserTitle"),
      message: `${t("adminDashboard.deleteUserStart")} @${user.username} (${user.email})? ${t("adminDashboard.deleteUserEnd")}`,
      confirmText: t("adminDashboard.deleteAccount"),
      confirmVariant: "danger",
      onConfirm: async () => {
        setDeletingId(user.id);
        try {
          await api.deleteUser(user.id);
          setUsers((list) => list.filter((u) => u.id !== user.id));
          showToast(`${t("adminDashboard.accountDeleted")} @${user.username}.`);
          loadData(true);
        } catch (err) {
          showToast(err instanceof ApiError ? err.detail : t("adminDashboard.deleteUserError"), "error");
        } finally {
          setDeletingId(null);
          setConfirmDialog(null);
        }
      },
    });
  }

  async function handleApproveResearcher(user) {
    setVerifyingId(user.id);
    try {
      await api.approveResearcher(user.id);
      showToast(`${t("adminDashboard.researcherApproved")} @${user.username}.`);
      loadData(true);
    } catch (err) {
      showToast(err instanceof ApiError ? err.detail : t("adminDashboard.approveError"), "error");
    } finally {
      setVerifyingId(null);
    }
  }

  function promptRejectResearcher(user) {
    setConfirmDialog({
      title: t("adminDashboard.rejectTitle"),
      message: `${t("adminDashboard.rejectQuestion")} @${user.username} (${user.email})?`,
      confirmText: t("adminDashboard.rejectResearcher"),
      confirmVariant: "danger",
      onConfirm: async () => {
        setVerifyingId(user.id);
        try {
          await api.rejectResearcher(user.id);
          showToast(`${t("adminDashboard.researcherRejected")} @${user.username}.`);
          loadData(true);
        } catch (err) {
          showToast(err instanceof ApiError ? err.detail : t("adminDashboard.rejectError"), "error");
        } finally {
          setVerifyingId(null);
          setConfirmDialog(null);
        }
      },
    });
  }

  async function handleDismissReport(reportId) {
    setActioningReportId(reportId);
    try {
      await api.dismissReport(reportId);
      showToast(t("adminDashboard.reportDismissed"));
      loadData(true);
    } catch (err) {
      showToast(err instanceof ApiError ? err.detail : t("adminDashboard.dismissError"), "error");
    } finally {
      setActioningReportId(null);
    }
  }

  async function handleResolveReportOnly(reportId) {
    setActioningReportId(reportId);
    try {
      await api.resolveReport(reportId);
      showToast(t("adminDashboard.reportResolved"));
      loadData(true);
    } catch (err) {
      showToast(err instanceof ApiError ? err.detail : t("adminDashboard.resolveError"), "error");
    } finally {
      setActioningReportId(null);
    }
  }

  function promptTakeDownAndResolve(report) {
    const targetLabel = report.target_type === "service" ? "Service" : report.target_type === "study" ? "Study" : "User";
    const titleOrId = report.target_title || `#${report.target_id}`;

    setConfirmDialog({
      title: `Take Down Flagged ${targetLabel}`,
      message: `Are you sure you want to delete ${targetLabel.toLowerCase()} "${titleOrId}" and resolve this report? This content will be permanently removed.`,
      confirmText: `Take Down & Resolve`,
      confirmVariant: "danger",
      onConfirm: async () => {
        setActioningReportId(report.id);
        try {
          if (report.target_type === "service") {
            await api.deleteService(report.target_id).catch(() => null);
          } else if (report.target_type === "study") {
            await api.deleteStudy(report.target_id).catch(() => null);
          } else if (report.target_type === "user") {
            await api.deleteUser(report.target_id).catch(() => null);
          }
          await api.resolveReport(report.id);
          showToast(`Flagged ${targetLabel.toLowerCase()} taken down and report resolved.`);
          loadData(true);
        } catch (err) {
          showToast(err instanceof ApiError ? err.detail : "Could not complete take down.", "error");
        } finally {
          setActioningReportId(null);
          setConfirmDialog(null);
        }
      },
    });
  }

  function promptDeleteReport(reportId) {
    setConfirmDialog({
      title: t("adminDashboard.deleteReportTitle"),
      message: t("adminDashboard.deleteReportQuestion"),
      confirmText: t("adminDashboard.deleteReport"),
      confirmVariant: "danger",
      onConfirm: async () => {
        setActioningReportId(reportId);
        try {
          await api.deleteReport(reportId);
          showToast(t("adminDashboard.reportDeleted"));
          loadData(true);
        } catch (err) {
          showToast(err instanceof ApiError ? err.detail : t("adminDashboard.deleteReportError"), "error");
        } finally {
          setActioningReportId(null);
          setConfirmDialog(null);
        }
      },
    });
  }

  async function handleSendAnnouncement(e) {
    e.preventDefault();
    if (!announcementContent.trim()) return;
    setSendingAnnouncement(true);
    try {
      await api.createAnnouncement({ audience, content: announcementContent.trim() });
      showToast(`Announcement broadcast successfully to ${audience}!`);
      setAnnouncementContent("");
      loadData(true);
    } catch (err) {
      showToast(err instanceof ApiError ? err.detail : t("adminDashboard.announcementError"), "error");
    } finally {
      setSendingAnnouncement(false);
    }
  }

  function promptDeleteAnnouncement(announcement) {
    setConfirmDialog({
      title: t("adminDashboard.deleteAnnouncementTitle"),
      message: `Delete announcement "${announcement.content.slice(0, 50)}..."? It will no longer be visible to ${announcement.audience}.`,
      confirmText: t("adminDashboard.deleteAnnouncement"),
      confirmVariant: "danger",
      onConfirm: async () => {
        setDeletingAnnouncementId(announcement.id);
        try {
          await api.deleteAnnouncement(announcement.id);
          showToast(t("adminDashboard.announcementDeleted"));
          loadData(true);
        } catch (err) {
          showToast(err instanceof ApiError ? err.detail : t("adminDashboard.deleteAnnouncementError"), "error");
        } finally {
          setDeletingAnnouncementId(null);
          setConfirmDialog(null);
        }
      },
    });
  }

  // Filtered lists
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.display_name && u.display_name.toLowerCase().includes(userSearch.toLowerCase()));
    const matchesRole = userRoleFilter === "all" || u.role === userRoleFilter;
    return matchesSearch && matchesRole;
  });

  const filteredReports = reports.filter((r) => {
    if (reportStatusFilter === "all") return true;
    return r.status === reportStatusFilter;
  });

  const openReportsCount = reports.filter((r) => r.status === "open").length;

  return (
    <DesktopLayout
      eyebrow={t("adminDashboard.eyebrow")}
      rightSlot={
        <Button
          variant="secondary"
          onClick={() => loadData(true)}
          disabled={refreshing}
          className="ch-admin-refresh-btn"
        >
          <Icon name="clock" size={13} style={{ marginRight: 6 }} />
          {refreshing ? t("adminDashboard.refreshing") : t("adminDashboard.syncData")}
        </Button>
      }
    >
      {/* Page Header */}
      <div className="ch-desktop__heading ch-admin-header">
        <div>
          <h1>{t("adminDashboard.title")}</h1>
          <p>{t("adminDashboard.subtitle")}</p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="ch-admin-tabs" role="tablist" aria-label={t("adminDashboard.navigationLabel")}>
        <button
          role="tab"
          aria-selected={activeTab === "overview"}
          className={`ch-admin-tab ${activeTab === "overview" ? "ch-admin-tab--active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          {t("adminDashboard.tabs.overview")}
        </button>
        <button
          role="tab"
          aria-selected={activeTab === "users"}
          className={`ch-admin-tab ${activeTab === "users" ? "ch-admin-tab--active" : ""}`}
          onClick={() => setActiveTab("users")}
        >
          {t("adminDashboard.tabs.users")} ({users.length})
        </button>
        <button
          role="tab"
          aria-selected={activeTab === "moderation"}
          className={`ch-admin-tab ${activeTab === "moderation" ? "ch-admin-tab--active" : ""}`}
          onClick={() => setActiveTab("moderation")}
        >
          {t("adminDashboard.tabs.moderation")} {openReportsCount > 0 && <span className="ch-tab-counter">{openReportsCount}</span>}
        </button>
        <button
          role="tab"
          aria-selected={activeTab === "announcements"}
          className={`ch-admin-tab ${activeTab === "announcements" ? "ch-admin-tab--active" : ""}`}
          onClick={() => setActiveTab("announcements")}
        >
          {t("adminDashboard.tabs.announcements")} ({announcements.length})
        </button>
        <button
          role="tab"
          aria-selected={activeTab === "audit"}
          className={`ch-admin-tab ${activeTab === "audit" ? "ch-admin-tab--active" : ""}`}
          onClick={() => setActiveTab("audit")}
        >
          {t("adminDashboard.tabs.audit")} ({auditLogs.length})
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="ch-admin-view">
          <div className="ch-stats-row">
            <StatCard label={t("adminDashboard.stats.totalUsers")} value={String(stats.total_users || users.length)} />
            <StatCard
              label={t("adminDashboard.stats.researchers")}
              value={String(stats.researchers || users.filter((u) => u.role === "researcher").length)}
            />
            <StatCard label={t("adminDashboard.stats.pendingVerification")} value={String(pendingResearchers.length)} />
            <StatCard label={t("adminDashboard.stats.openReports")} value={String(openReportsCount)} />
          </div>

          {/* Pending Researcher Verifications */}
          <Card
            title={
              <div className="ch-card-title-row">
                <span>{t("adminDashboard.pendingResearchers")}</span>
                {pendingResearchers.length > 0 && (
                  <span className="ch-badge-pill">{pendingResearchers.length} {t("adminDashboard.awaitingAction")}</span>
                )}
              </div>
            }
          >
            {loading && <p className="ch-dash-empty">{t("adminDashboard.loadingApplications")}</p>}
            {!loading && pendingResearchers.length === 0 && (
              <p className="ch-dash-empty">{t("adminDashboard.noPendingResearchers")}</p>
            )}
            {pendingResearchers.map((pr) => (
              <div className="ch-row" key={pr.id}>
                <div>
                  <p className="ch-row__title">
                    {pr.display_name || pr.username}{" "}
                    <span className="ch-admin-subhandle">@{pr.username}</span>
                  </p>
                  <p className="ch-row__meta">
                    {pr.email} • {t("adminDashboard.registered")} {new Date(pr.time).toLocaleDateString(locale)}
                  </p>
                </div>
                <div className="ch-action-group">
                  <Button
                    variant="accent"
                    disabled={verifyingId === pr.id}
                    onClick={() => handleApproveResearcher(pr)}
                  >
                    {t("adminDashboard.approve")}
                  </Button>
                  <Button
                    variant="secondary"
                    className="ch-btn-danger"
                    disabled={verifyingId === pr.id}
                    onClick={() => promptRejectResearcher(pr)}
                  >
                    {t("adminDashboard.reject")}
                  </Button>
                </div>
              </div>
            ))}
          </Card>

          {/* Quick Flagged Items preview */}
          <Card
            title={
              <div className="ch-card-title-row">
                <span>{t("adminDashboard.flaggedPreview")}</span>
                <Button variant="secondary" onClick={() => setActiveTab("moderation")}>
                  {t("adminDashboard.viewAll")} ({reports.length})
                </Button>
              </div>
            }
          >
            {loading && <p className="ch-dash-empty">{t("adminDashboard.checkingListings")}</p>}
            {!loading && openReportsCount === 0 && (
              <p className="ch-dash-empty">{t("adminDashboard.noFlaggedListings")}</p>
            )}
            {reports
              .filter((r) => r.status === "open")
              .slice(0, 3)
              .map((m) => (
                <div className="ch-row" key={m.id}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                      <span className="ch-target-badge">{m.target_type.toUpperCase()}</span>
                      <p className="ch-row__title" style={{ margin: 0 }}>
                        {m.target_title || `Item #${m.target_id}`}
                      </p>
                    </div>
                    <p className="ch-row__meta">
                      {t("adminDashboard.flaggedBy")} @{m.reporter_username} • {t("adminDashboard.reason")}: <em>{m.reason}</em>
                    </p>
                  </div>
                  <div className="ch-action-group">
                    <Button
                      variant="secondary"
                      className="ch-btn-danger"
                      disabled={actioningReportId === m.id}
                      onClick={() => promptTakeDownAndResolve(m)}
                    >
                      {t("adminDashboard.takeDown")}
                    </Button>
                    <Button
                      variant="secondary"
                      disabled={actioningReportId === m.id}
                      onClick={() => handleDismissReport(m.id)}
                    >
                      {t("adminDashboard.dismiss")}
                    </Button>
                  </div>
                </div>
              ))}
          </Card>
        </div>
      )}

      {/* TAB 2: USER MANAGEMENT */}
      {activeTab === "users" && (
        <div className="ch-admin-view">
          <Card
            title={
              <div className="ch-card-title-row">
                <span>{t("adminDashboard.userDirectory")}</span>
                <span className="ch-row__meta">
                  {t("adminDashboard.showing")} {filteredUsers.length} {t("adminDashboard.of")} {users.length} {t("adminDashboard.accounts")}
                </span>
              </div>
            }
          >
            {/* Filter toolbar */}
            <div className="ch-admin-toolbar">
              <input
                type="text"
                className="ch-search-input"
                placeholder={t("adminDashboard.searchUsers")}
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
              />
              <div className="ch-filter-chips">
                <Chip
                  label={t("adminDashboard.allRoles")}
                  active={userRoleFilter === "all"}
                  onClick={() => setUserRoleFilter("all")}
                />
                <Chip
                  label={t("adminDashboard.community")}
                  active={userRoleFilter === "community_member"}
                  onClick={() => setUserRoleFilter("community_member")}
                />
                <Chip
                  label={t("adminDashboard.roles.researchers")}
                  active={userRoleFilter === "researcher"}
                  onClick={() => setUserRoleFilter("researcher")}
                />
                <Chip
                  label={t("adminDashboard.admins")}
                  active={userRoleFilter === "admin"}
                  onClick={() => setUserRoleFilter("admin")}
                />
              </div>
            </div>

            {loading && <p className="ch-dash-empty">{t("adminDashboard.loadingUsers")}</p>}
            {!loading && filteredUsers.length === 0 && (
              <p className="ch-dash-empty">{t("adminDashboard.noMatchingAccounts")}</p>
            )}

            {filteredUsers.map((u) => {
              const isSelf = currentUser?.id === u.id;
              return (
                <div className="ch-row ch-user-row" key={u.id}>
                  <div className="ch-user-info">
                    <div className="ch-user-avatar-initials">
                      {(u.username || "?").slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="ch-row__title">
                        {u.display_name || u.username}{" "}
                        <span className="ch-admin-subhandle">@{u.username}</span>
                        {isSelf && <span className="ch-self-tag">{t("adminDashboard.you")}</span>}
                      </p>
                      <p className="ch-row__meta">
                        {u.email} • ID #{u.id} • {t("adminDashboard.joined")} {new Date(u.time).toLocaleDateString(locale)}
                      </p>
                    </div>
                  </div>

                  <div className="ch-role-control">
                    <StatusChip
                      label={roleLabel[u.role] || u.role}
                      tone={u.role === "admin" ? "warning" : u.role === "researcher" ? "positive" : "neutral"}
                    />
                    <select
                      className="ch-role-select"
                      value={u.role}
                      disabled={updatingId === u.id || deletingId === u.id || isSelf}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      title={isSelf ? t("adminDashboard.cannotModifyOwnRole") : t("adminDashboard.modifyRole")}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {roleLabel[r]}
                        </option>
                      ))}
                    </select>

                    <Button
                      variant="secondary"
                      className="ch-btn-danger"
                      disabled={deletingId === u.id || isSelf}
                      onClick={() => promptDeleteUser(u)}
                      title={isSelf ? t("adminDashboard.cannotDeleteOwnAccount") : t("adminDashboard.permanentlyDeleteAccount")}
                    >
                      {t("adminDashboard.delete")}
                    </Button>
                  </div>
                </div>
              );
            })}
          </Card>
        </div>
      )}

      {/* TAB 3: MODERATION QUEUE */}
      {activeTab === "moderation" && (
        <div className="ch-admin-view">
          <Card
            title={
              <div className="ch-card-title-row">
                <span>{t("adminDashboard.tabs.moderation")}</span>
                <div className="ch-filter-chips">
                  <Chip
                    label={`${t("adminDashboard.open")} (${openReportsCount})`}
                    active={reportStatusFilter === "open"}
                    onClick={() => setReportStatusFilter("open")}
                  />
                  <Chip
                    label={t("adminDashboard.resolved")}
                    active={reportStatusFilter === "resolved"}
                    onClick={() => setReportStatusFilter("resolved")}
                  />
                  <Chip
                    label={t("adminDashboard.dismissed")}
                    active={reportStatusFilter === "dismissed"}
                    onClick={() => setReportStatusFilter("dismissed")}
                  />
                  <Chip
                    label={t("adminDashboard.allReports")}
                    active={reportStatusFilter === "all"}
                    onClick={() => setReportStatusFilter("all")}
                  />
                </div>
              </div>
            }
          >
            {loading && <p className="ch-dash-empty">{t("adminDashboard.loadingReports")}</p>}
            {!loading && filteredReports.length === 0 && (
              <p className="ch-dash-empty">{t("adminDashboard.noReports")} "{reportStatusFilter}".</p>
            )}

            {filteredReports.map((m) => {
              const isOpen = m.status === "open";
              const targetLabel = m.target_type ? m.target_type.toUpperCase() : "LISTING";
              return (
                <div className="ch-row ch-report-row" key={m.id}>
                  <div className="ch-report-details">
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                      <span className="ch-target-badge">{targetLabel}</span>
                      <p className="ch-row__title" style={{ margin: 0 }}>
                        {m.target_title || `Target ID #${m.target_id}`}
                      </p>
                      <StatusChip
                        label={m.status.toUpperCase()}
                        tone={m.status === "open" ? "warning" : m.status === "resolved" ? "positive" : "neutral"}
                      />
                    </div>
                    <p className="ch-row__meta">
                      {t("adminDashboard.reportedBy")} <strong>@{m.reporter_username}</strong> • {t("adminDashboard.reason")}:{" "}
                      <span className="ch-report-reason">"{m.reason}"</span>
                    </p>
                    <p className="ch-row__meta">
                      {t("adminDashboard.loggedOn")} {new Date(m.created_at).toLocaleString(locale)}
                      {m.resolved_at && ` • ${t("adminDashboard.processed")} ${new Date(m.resolved_at).toLocaleString(locale)}`}
                    </p>
                  </div>

                  <div className="ch-action-group">
                    {isOpen ? (
                      <>
                        <Button
                          variant="secondary"
                          className="ch-btn-danger"
                          disabled={actioningReportId === m.id}
                          onClick={() => promptTakeDownAndResolve(m)}
                        >
                          {t("adminDashboard.takeDownResolve")}
                        </Button>
                        <Button
                          variant="secondary"
                          disabled={actioningReportId === m.id}
                          onClick={() => handleResolveReportOnly(m.id)}
                        >
                          {t("adminDashboard.markResolved")}
                        </Button>
                        <Button
                          variant="secondary"
                          disabled={actioningReportId === m.id}
                          onClick={() => handleDismissReport(m.id)}
                        >
                          {t("adminDashboard.dismiss")}
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="secondary"
                        className="ch-btn-danger"
                        disabled={actioningReportId === m.id}
                        onClick={() => promptDeleteReport(m.id)}
                      >
                        {t("adminDashboard.deleteReport")}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </Card>
        </div>
      )}

      {/* TAB 4: ANNOUNCEMENTS */}
      {activeTab === "announcements" && (
        <div className="ch-admin-view">
          <div className="ch-admin-split">
            {/* Compose Card */}
            <Card title={t("adminDashboard.broadcastTitle")}>
              <form className="ch-announce" onSubmit={handleSendAnnouncement}>
                <span className="ch-field-block__label">{t("adminDashboard.audience")}</span>
                <div className="ch-announce__row">
                  {audienceOptions.map((option) => (
                    <Chip key={option.value} label={option.label} active={audience === option.value} onClick={() => setAudience(option.value)} />
                  ))}
                </div>
                <Field
                  label={t("adminDashboard.announcementMessage")}
                  id="announcement"
                  as="textarea"
                  placeholder={t("adminDashboard.announcementPlaceholder")}
                  value={announcementContent}
                  onChange={(e) => setAnnouncementContent(e.target.value)}
                  rows={4}
                  required
                />
                <Button
                  type="submit"
                  variant="accent"
                  disabled={!announcementContent.trim() || sendingAnnouncement}
                >
                  {sendingAnnouncement ? t("adminDashboard.broadcasting") : t("adminDashboard.postAnnouncement")}
                </Button>
              </form>
            </Card>

            {/* Active Announcements */}
            <Card title={`${t("adminDashboard.activeAnnouncements")} (${announcements.length})`}>
              {announcements.length === 0 && (
                <p className="ch-dash-empty">{t("adminDashboard.noAnnouncements")}</p>
              )}
              {announcements.map((a) => (
                <div className="ch-row ch-announcement-item" key={a.id}>
                  <div>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "4px" }}>
                      <span className="ch-audience-pill">{a.audience}</span>
                      <span className="ch-row__meta">
                        {t("adminDashboard.by")} @{a.author_username} • {new Date(a.created_at).toLocaleDateString(locale)}
                      </span>
                    </div>
                    <p className="ch-announcement-text">{a.content}</p>
                  </div>
                  <div>
                    <Button
                      variant="secondary"
                      className="ch-btn-danger"
                      disabled={deletingAnnouncementId === a.id}
                      onClick={() => promptDeleteAnnouncement(a)}
                    >
                      {t("adminDashboard.delete")}
                    </Button>
                  </div>
                </div>
              ))}
            </Card>
          </div>
        </div>
      )}

      {/* TAB 5: AUDIT LOG */}
      {activeTab === "audit" && (
        <div className="ch-admin-view">
          <Card
            title={
              <div className="ch-card-title-row">
                <span>{t("adminDashboard.auditTitle")}</span>
                <span className="ch-row__meta">{t("adminDashboard.auditDescription")}</span>
              </div>
            }
          >
            {loading && <p className="ch-dash-empty">{t("adminDashboard.loadingAudit")}</p>}
            {!loading && auditLogs.length === 0 && (
              <p className="ch-dash-empty">{t("adminDashboard.noAuditRecords")}</p>
            )}

            <div className="ch-audit-table-wrapper">
              <table className="ch-audit-table">
                <thead>
                  <tr>
                    <th>{t("adminDashboard.timestamp")}</th>
                    <th>{t("adminDashboard.actor")}</th>
                    <th>{t("adminDashboard.action")}</th>
                    <th>{t("adminDashboard.target")}</th>
                    <th>{t("adminDashboard.details")}</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((entry) => (
                    <tr key={entry.id}>
                      <td className="ch-audit-time">
                        {new Date(entry.created_at).toLocaleString(locale)}
                      </td>
                      <td>
                        <strong>@{entry.actor_username || `User #${entry.actor_id}`}</strong>
                      </td>
                      <td>
                        <span className={`ch-action-badge ch-action-badge--${getActionTone(entry.action)}`}>
                          {formatActionName(entry.action)}
                        </span>
                      </td>
                      <td>
                        {entry.target_type && (
                          <span className="ch-target-badge">{entry.target_type.toUpperCase()}</span>
                        )}
                        {entry.target_id && <span style={{ marginLeft: 6, fontSize: "12px", color: "var(--color-sage)" }}>#{entry.target_id}</span>}
                      </td>
                      <td className="ch-audit-details">
                        {formatAuditDetails(entry.details)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* IN-APP CONFIRMATION MODAL */}
      {confirmDialog && (
        <div className="ch-modal-backdrop" onClick={() => setConfirmDialog(null)}>
          <div className="ch-modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 className="ch-modal-title">{confirmDialog.title}</h3>
            <p className="ch-modal-message">{confirmDialog.message}</p>
            <div className="ch-modal-actions">
              <Button variant="secondary" onClick={() => setConfirmDialog(null)}>
                {t("common.cancel")}
              </Button>
              <Button
                variant={confirmDialog.confirmVariant || "danger"}
                className={confirmDialog.confirmVariant === "danger" ? "ch-btn-danger--solid" : ""}
                onClick={confirmDialog.onConfirm}
              >
                {confirmDialog.confirmText || t("adminDashboard.confirm")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING TOAST NOTIFICATION */}
      {toast && (
        <div className={`ch-admin-toast ch-admin-toast--${toast.type}`} role="alert">
          <span>{toast.message}</span>
          <button className="ch-admin-toast-close" onClick={() => setToast(null)} aria-label={t("adminDashboard.closeNotification")}>
            ✕
          </button>
        </div>
      )}
    </DesktopLayout>
  );
}

function getActionTone(action) {
  if (action.includes("delete") || action.includes("reject")) return "danger";
  if (action.includes("approve") || action.includes("resolved")) return "positive";
  return "neutral";
}

function formatActionName(action) {
  return action
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatAuditDetails(details) {
  if (!details) return "—";
  if (typeof details === "string") return details;
  return Object.entries(details)
    .map(([k, v]) => `${k}: ${v}`)
    .join(" • ");
}
