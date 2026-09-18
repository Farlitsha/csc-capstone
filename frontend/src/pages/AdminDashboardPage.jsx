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
import { api, ApiError } from "../lib/api";
import "./AdminDashboardPage.css";

const ROLE_LABEL = {
  community_member: "Community member",
  researcher: "Researcher",
  admin: "Administrator",
};
const ROLES = ["community_member", "researcher", "admin"];

const TARGET_ICONS = {
  service: "tools",
  study: "document",
  user: "user",
};

export default function AdminDashboardPage() {
  const { user: currentUser } = useAuth();

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
        showToast("Could not load latest admin data from the server.", "error");
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
      showToast(`User role updated to ${ROLE_LABEL[newRole] || newRole}.`);
      loadData(true);
    } catch (err) {
      showToast(err instanceof ApiError ? err.detail : "Could not update user role.", "error");
    } finally {
      setUpdatingId(null);
    }
  }

  function promptDeleteUser(user) {
    if (currentUser?.id === user.id) {
      showToast("You cannot delete your own active administrator account.", "error");
      return;
    }
    setConfirmDialog({
      title: "Delete User Account",
      message: `Are you sure you want to permanently delete account @${user.username} (${user.email})? This action removes their access and is recorded to the system audit trail.`,
      confirmText: "Delete Account",
      confirmVariant: "danger",
      onConfirm: async () => {
        setDeletingId(user.id);
        try {
          await api.deleteUser(user.id);
          setUsers((list) => list.filter((u) => u.id !== user.id));
          showToast(`Account @${user.username} deleted successfully.`);
          loadData(true);
        } catch (err) {
          showToast(err instanceof ApiError ? err.detail : "Could not delete user account.", "error");
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
      showToast(`Researcher @${user.username} has been approved.`);
      loadData(true);
    } catch (err) {
      showToast(err instanceof ApiError ? err.detail : "Could not approve researcher.", "error");
    } finally {
      setVerifyingId(null);
    }
  }

  function promptRejectResearcher(user) {
    setConfirmDialog({
      title: "Reject Researcher Application",
      message: `Reject researcher verification request for @${user.username} (${user.email})?`,
      confirmText: "Reject Researcher",
      confirmVariant: "danger",
      onConfirm: async () => {
        setVerifyingId(user.id);
        try {
          await api.rejectResearcher(user.id);
          showToast(`Researcher application for @${user.username} rejected.`);
          loadData(true);
        } catch (err) {
          showToast(err instanceof ApiError ? err.detail : "Could not reject researcher.", "error");
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
      showToast("Report has been dismissed.");
      loadData(true);
    } catch (err) {
      showToast(err instanceof ApiError ? err.detail : "Could not dismiss report.", "error");
    } finally {
      setActioningReportId(null);
    }
  }

  async function handleResolveReportOnly(reportId) {
    setActioningReportId(reportId);
    try {
      await api.resolveReport(reportId);
      showToast("Report marked as resolved.");
      loadData(true);
    } catch (err) {
      showToast(err instanceof ApiError ? err.detail : "Could not resolve report.", "error");
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
      title: "Delete Report Entry",
      message: "Are you sure you want to permanently delete this report record?",
      confirmText: "Delete Report",
      confirmVariant: "danger",
      onConfirm: async () => {
        setActioningReportId(reportId);
        try {
          await api.deleteReport(reportId);
          showToast("Report entry deleted.");
          loadData(true);
        } catch (err) {
          showToast(err instanceof ApiError ? err.detail : "Could not delete report.", "error");
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
      showToast(err instanceof ApiError ? err.detail : "Could not send announcement.", "error");
    } finally {
      setSendingAnnouncement(false);
    }
  }

  function promptDeleteAnnouncement(announcement) {
    setConfirmDialog({
      title: "Delete Platform Announcement",
      message: `Delete announcement "${announcement.content.slice(0, 50)}..."? It will no longer be visible to ${announcement.audience}.`,
      confirmText: "Delete Announcement",
      confirmVariant: "danger",
      onConfirm: async () => {
        setDeletingAnnouncementId(announcement.id);
        try {
          await api.deleteAnnouncement(announcement.id);
          showToast("Announcement deleted successfully.");
          loadData(true);
        } catch (err) {
          showToast(err instanceof ApiError ? err.detail : "Could not delete announcement.", "error");
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
      eyebrow="COMMUNITY HUB • ADMIN CONSOLE"
      rightSlot={
        <Button
          variant="secondary"
          onClick={() => loadData(true)}
          disabled={refreshing}
          className="ch-admin-refresh-btn"
        >
          <Icon name="clock" size={13} style={{ marginRight: 6 }} />
          {refreshing ? "Refreshing…" : "Sync data"}
        </Button>
      }
    >
      {/* Page Header */}
      <div className="ch-desktop__heading ch-admin-header">
        <div>
          <h1>Admin Console</h1>
          <p>Supervise platform safety, verify researchers, manage roles, and monitor system events.</p>
        </div>
        <div className="ch-admin-status-badge">
          <span className="ch-admin-live-dot" />
          <span>Admin mode active</span>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="ch-admin-tabs" role="tablist" aria-label="Admin console navigation">
        <button
          role="tab"
          aria-selected={activeTab === "overview"}
          className={`ch-admin-tab ${activeTab === "overview" ? "ch-admin-tab--active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          Overview
        </button>
        <button
          role="tab"
          aria-selected={activeTab === "users"}
          className={`ch-admin-tab ${activeTab === "users" ? "ch-admin-tab--active" : ""}`}
          onClick={() => setActiveTab("users")}
        >
          User Accounts ({users.length})
        </button>
        <button
          role="tab"
          aria-selected={activeTab === "moderation"}
          className={`ch-admin-tab ${activeTab === "moderation" ? "ch-admin-tab--active" : ""}`}
          onClick={() => setActiveTab("moderation")}
        >
          Moderation Queue {openReportsCount > 0 && <span className="ch-tab-counter">{openReportsCount}</span>}
        </button>
        <button
          role="tab"
          aria-selected={activeTab === "announcements"}
          className={`ch-admin-tab ${activeTab === "announcements" ? "ch-admin-tab--active" : ""}`}
          onClick={() => setActiveTab("announcements")}
        >
          Announcements ({announcements.length})
        </button>
        <button
          role="tab"
          aria-selected={activeTab === "audit"}
          className={`ch-admin-tab ${activeTab === "audit" ? "ch-admin-tab--active" : ""}`}
          onClick={() => setActiveTab("audit")}
        >
          Audit Log ({auditLogs.length})
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="ch-admin-view">
          <div className="ch-stats-row">
            <StatCard label="TOTAL USERS" value={String(stats.total_users || users.length)} />
            <StatCard
              label="RESEARCHERS"
              value={String(stats.researchers || users.filter((u) => u.role === "researcher").length)}
            />
            <StatCard label="PENDING VERIFICATION" value={String(pendingResearchers.length)} />
            <StatCard label="OPEN REPORTS" value={String(openReportsCount)} />
          </div>

          {/* Pending Researcher Verifications */}
          <Card
            title={
              <div className="ch-card-title-row">
                <span>Pending researcher verifications</span>
                {pendingResearchers.length > 0 && (
                  <span className="ch-badge-pill">{pendingResearchers.length} awaiting action</span>
                )}
              </div>
            }
          >
            {loading && <p className="ch-dash-empty">Loading pending applications…</p>}
            {!loading && pendingResearchers.length === 0 && (
              <p className="ch-dash-empty">No researchers currently awaiting verification. All caught up!</p>
            )}
            {pendingResearchers.map((pr) => (
              <div className="ch-row" key={pr.id}>
                <div>
                  <p className="ch-row__title">
                    {pr.display_name || pr.username}{" "}
                    <span className="ch-admin-subhandle">@{pr.username}</span>
                  </p>
                  <p className="ch-row__meta">
                    {pr.email} • Registered {new Date(pr.time).toLocaleDateString()}
                  </p>
                </div>
                <div className="ch-action-group">
                  <Button
                    variant="accent"
                    disabled={verifyingId === pr.id}
                    onClick={() => handleApproveResearcher(pr)}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="secondary"
                    className="ch-btn-danger"
                    disabled={verifyingId === pr.id}
                    onClick={() => promptRejectResearcher(pr)}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </Card>

          {/* Quick Flagged Items preview */}
          <Card
            title={
              <div className="ch-card-title-row">
                <span>Flagged listings preview</span>
                <Button variant="secondary" onClick={() => setActiveTab("moderation")}>
                  View all ({reports.length})
                </Button>
              </div>
            }
          >
            {loading && <p className="ch-dash-empty">Checking flagged listings…</p>}
            {!loading && openReportsCount === 0 && (
              <p className="ch-dash-empty">Zero open flagged listings. Community content is healthy!</p>
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
                      Flagged by @{m.reporter_username} • Reason: <em>{m.reason}</em>
                    </p>
                  </div>
                  <div className="ch-action-group">
                    <Button
                      variant="secondary"
                      className="ch-btn-danger"
                      disabled={actioningReportId === m.id}
                      onClick={() => promptTakeDownAndResolve(m)}
                    >
                      Take Down
                    </Button>
                    <Button
                      variant="secondary"
                      disabled={actioningReportId === m.id}
                      onClick={() => handleDismissReport(m.id)}
                    >
                      Dismiss
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
                <span>User directory & role permissions</span>
                <span className="ch-row__meta">
                  Showing {filteredUsers.length} of {users.length} accounts
                </span>
              </div>
            }
          >
            {/* Filter toolbar */}
            <div className="ch-admin-toolbar">
              <input
                type="text"
                className="ch-search-input"
                placeholder="Search by username, name, or email…"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
              />
              <div className="ch-filter-chips">
                <Chip
                  label="All roles"
                  active={userRoleFilter === "all"}
                  onClick={() => setUserRoleFilter("all")}
                />
                <Chip
                  label="Community"
                  active={userRoleFilter === "community_member"}
                  onClick={() => setUserRoleFilter("community_member")}
                />
                <Chip
                  label="Researchers"
                  active={userRoleFilter === "researcher"}
                  onClick={() => setUserRoleFilter("researcher")}
                />
                <Chip
                  label="Admins"
                  active={userRoleFilter === "admin"}
                  onClick={() => setUserRoleFilter("admin")}
                />
              </div>
            </div>

            {loading && <p className="ch-dash-empty">Loading users…</p>}
            {!loading && filteredUsers.length === 0 && (
              <p className="ch-dash-empty">No accounts matching your search criteria.</p>
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
                        {isSelf && <span className="ch-self-tag">You</span>}
                      </p>
                      <p className="ch-row__meta">
                        {u.email} • ID #{u.id} • Joined {new Date(u.time).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="ch-role-control">
                    <StatusChip
                      label={ROLE_LABEL[u.role] || u.role}
                      tone={u.role === "admin" ? "warning" : u.role === "researcher" ? "positive" : "neutral"}
                    />
                    <select
                      className="ch-role-select"
                      value={u.role}
                      disabled={updatingId === u.id || deletingId === u.id || isSelf}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      title={isSelf ? "You cannot modify your own role" : "Modify user role"}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABEL[r]}
                        </option>
                      ))}
                    </select>

                    <Button
                      variant="secondary"
                      className="ch-btn-danger"
                      disabled={deletingId === u.id || isSelf}
                      onClick={() => promptDeleteUser(u)}
                      title={isSelf ? "Cannot delete your own account" : "Permanently delete account"}
                    >
                      Delete
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
                <span>Moderation Queue</span>
                <div className="ch-filter-chips">
                  <Chip
                    label={`Open (${openReportsCount})`}
                    active={reportStatusFilter === "open"}
                    onClick={() => setReportStatusFilter("open")}
                  />
                  <Chip
                    label="Resolved"
                    active={reportStatusFilter === "resolved"}
                    onClick={() => setReportStatusFilter("resolved")}
                  />
                  <Chip
                    label="Dismissed"
                    active={reportStatusFilter === "dismissed"}
                    onClick={() => setReportStatusFilter("dismissed")}
                  />
                  <Chip
                    label="All reports"
                    active={reportStatusFilter === "all"}
                    onClick={() => setReportStatusFilter("all")}
                  />
                </div>
              </div>
            }
          >
            {loading && <p className="ch-dash-empty">Loading reports…</p>}
            {!loading && filteredReports.length === 0 && (
              <p className="ch-dash-empty">No reports found under status "{reportStatusFilter}".</p>
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
                      Reported by <strong>@{m.reporter_username}</strong> • Reason:{" "}
                      <span className="ch-report-reason">"{m.reason}"</span>
                    </p>
                    <p className="ch-row__meta">
                      Logged on {new Date(m.created_at).toLocaleString()}
                      {m.resolved_at && ` • Processed ${new Date(m.resolved_at).toLocaleString()}`}
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
                          Take Down & Resolve
                        </Button>
                        <Button
                          variant="secondary"
                          disabled={actioningReportId === m.id}
                          onClick={() => handleResolveReportOnly(m.id)}
                        >
                          Mark Resolved
                        </Button>
                        <Button
                          variant="secondary"
                          disabled={actioningReportId === m.id}
                          onClick={() => handleDismissReport(m.id)}
                        >
                          Dismiss
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="secondary"
                        className="ch-btn-danger"
                        disabled={actioningReportId === m.id}
                        onClick={() => promptDeleteReport(m.id)}
                      >
                        Delete Report
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
            <Card title="Broadcast system announcement">
              <form className="ch-announce" onSubmit={handleSendAnnouncement}>
                <span className="ch-field-block__label">Audience</span>
                <div className="ch-announce__row">
                  {["All members", "Community Members", "Researchers", "Admins only"].map((a) => (
                    <Chip key={a} label={a} active={audience === a} onClick={() => setAudience(a)} />
                  ))}
                </div>
                <Field
                  label="Announcement Message"
                  id="announcement"
                  as="textarea"
                  placeholder="Share a community notice, maintenance window, or platform update…"
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
                  {sendingAnnouncement ? "Broadcasting…" : "Post announcement"}
                </Button>
              </form>
            </Card>

            {/* Active Announcements */}
            <Card title={`Active announcements (${announcements.length})`}>
              {announcements.length === 0 && (
                <p className="ch-dash-empty">No active broadcast announcements.</p>
              )}
              {announcements.map((a) => (
                <div className="ch-row ch-announcement-item" key={a.id}>
                  <div>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "4px" }}>
                      <span className="ch-audience-pill">{a.audience}</span>
                      <span className="ch-row__meta">
                        By @{a.author_username} • {new Date(a.created_at).toLocaleDateString()}
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
                      Delete
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
                <span>System Audit Trail</span>
                <span className="ch-row__meta">Immutable record of administrative and moderation actions</span>
              </div>
            }
          >
            {loading && <p className="ch-dash-empty">Loading audit records…</p>}
            {!loading && auditLogs.length === 0 && (
              <p className="ch-dash-empty">No audit records logged yet.</p>
            )}

            <div className="ch-audit-table-wrapper">
              <table className="ch-audit-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Actor</th>
                    <th>Action</th>
                    <th>Target</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((entry) => (
                    <tr key={entry.id}>
                      <td className="ch-audit-time">
                        {new Date(entry.created_at).toLocaleString()}
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
                Cancel
              </Button>
              <Button
                variant={confirmDialog.confirmVariant || "danger"}
                className={confirmDialog.confirmVariant === "danger" ? "ch-btn-danger--solid" : ""}
                onClick={confirmDialog.onConfirm}
              >
                {confirmDialog.confirmText || "Confirm"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING TOAST NOTIFICATION */}
      {toast && (
        <div className={`ch-admin-toast ch-admin-toast--${toast.type}`} role="alert">
          <span>{toast.message}</span>
          <button className="ch-admin-toast-close" onClick={() => setToast(null)} aria-label="Close notification">
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
