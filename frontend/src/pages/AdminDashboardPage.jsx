import { useEffect, useState } from "react";
import DesktopLayout from "../layouts/DesktopLayout";
import StatCard from "../components/StatCard";
import StatusChip from "../components/StatusChip";
import Button from "../components/Button";
import Card from "../components/Card";
import Field from "../components/Field";
import Chip from "../components/Chip";
import { api, ApiError } from "../lib/api";
import "./AdminDashboardPage.css";

const ROLE_LABEL = {
  community_member: "Community member",
  researcher: "Researcher",
  admin: "Admin",
};
const ROLES = ["community_member", "researcher", "admin"];

export default function AdminDashboardPage() {
  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [pendingResearchers, setPendingResearchers] = useState([]);
  const [stats, setStats] = useState({
    total_users: 0,
    researchers: 0,
    admins: 0,
    community_members: 0,
    flagged_listings: 0,
    total_services: 0,
    total_studies: 0,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [verifyingId, setVerifyingId] = useState(null);
  const [audience, setAudience] = useState("All members");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [announceFeedback, setAnnounceFeedback] = useState("");
  const [actioningReportId, setActioningReportId] = useState(null);

  function loadData() {
    setLoading(true);
    Promise.all([
      api.listUsers().catch(() => []),
      api.listReports().catch(() => []),
      api.listPendingResearchers().catch(() => []),
      api.getAdminStats().catch(() => null),
    ])
      .then(([usersData, reportsData, pendingData, statsData]) => {
        setUsers(usersData);
        setReports(reportsData);
        setPendingResearchers(pendingData);
        if (statsData) {
          setStats(statsData);
        } else {
          setStats((prev) => ({
            ...prev,
            total_users: usersData.length,
            researchers: usersData.filter((u) => u.role === "researcher").length,
            admins: usersData.filter((u) => u.role === "admin").length,
            flagged_listings: reportsData.length,
          }));
        }
      })
      .catch(() => setError("Could not load admin data from the server."))
      .finally(() => setLoading(false));
  }

  useEffect(loadData, []);

  async function handleRoleChange(userId, role) {
    setUpdatingId(userId);
    try {
      const updated = await api.updateUserRole(userId, role);
      setUsers((list) => list.map((u) => (u.id === userId ? updated : u)));
      loadData();
    } catch (err) {
      alert(err instanceof ApiError ? err.detail : "Could not update this user's role.");
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleDeleteUser(user) {
    if (!window.confirm(`Are you sure you want to delete user "${user.username}"? This cannot be undone.`)) {
      return;
    }
    setDeletingId(user.id);
    try {
      await api.deleteUser(user.id);
      setUsers((list) => list.filter((u) => u.id !== user.id));
      loadData();
    } catch (err) {
      alert(err instanceof ApiError ? err.detail : "Could not delete this user.");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleDismissReport(reportId) {
    setActioningReportId(reportId);
    try {
      await api.dismissReport(reportId);
      setReports((list) => list.filter((r) => r.id !== reportId));
      loadData();
    } catch (err) {
      alert(err instanceof ApiError ? err.detail : "Could not dismiss this report.");
    } finally {
      setActioningReportId(null);
    }
  }

  async function handleTakeDownListing(report) {
    if (!window.confirm(`Take down and delete listing "${report.service_title}"?`)) {
      return;
    }
    setActioningReportId(report.id);
    try {
      await api.deleteService(report.service_id);
      setReports((list) => list.filter((r) => r.service_id !== report.service_id));
      loadData();
    } catch (err) {
      alert(err instanceof ApiError ? err.detail : "Could not take down this listing.");
    } finally {
      setActioningReportId(null);
    }
  }

  async function handleApproveResearcher(user) {
    setVerifyingId(user.id);
    try {
      await api.approveResearcher(user.id);
      loadData();
    } catch (err) {
      alert(err instanceof ApiError ? err.detail : "Could not approve researcher.");
    } finally {
      setVerifyingId(null);
    }
  }

  async function handleRejectResearcher(user) {
    if (!window.confirm(`Reject researcher account for "${user.username}"?`)) return;
    setVerifyingId(user.id);
    try {
      await api.rejectResearcher(user.id);
      loadData();
    } catch (err) {
      alert(err instanceof ApiError ? err.detail : "Could not reject researcher.");
    } finally {
      setVerifyingId(null);
    }
  }

  async function handleSendAnnouncement(e) {
    e.preventDefault();
    if (!message.trim()) return;
    setSending(true);
    setAnnounceFeedback("");
    try {
      await api.createAnnouncement({ audience, content: message });
      setAnnounceFeedback("Announcement broadcast successfully to " + audience + "!");
      setMessage("");
      setTimeout(() => setAnnounceFeedback(""), 5000);
    } catch (err) {
      alert(err instanceof ApiError ? err.detail : "Could not send announcement.");
    } finally {
      setSending(false);
    }
  }

  return (
    <DesktopLayout eyebrow="ADMIN CONSOLE">
      <div className="ch-desktop__heading">
        <h1>Platform overview</h1>
        <p>Ocean View Community Hub</p>
      </div>


      <div className="ch-stats-row">
        <StatCard label="TOTAL USERS" value={String(stats.total_users || users.length)} />
        <StatCard label="RESEARCHERS" value={String(stats.researchers || users.filter((u) => u.role === "researcher").length)} />
        <StatCard label="PENDING VERIFICATION" value={String(pendingResearchers.length)} />
        <StatCard label="FLAGGED LISTINGS" value={String(stats.flagged_listings || reports.length)} />
      </div>

      {pendingResearchers.length > 0 && (
        <Card title={`Pending researcher verifications (${pendingResearchers.length})`}>
          {pendingResearchers.map((pr) => (
            <div className="ch-row" key={pr.id}>
              <div>
                <p className="ch-row__title">{pr.display_name || pr.username} <span style={{ fontSize: "12px", color: "var(--color-muted, #666)" }}>@{pr.username}</span></p>
                <p className="ch-row__meta">{pr.email} • Registered {new Date(pr.time).toLocaleDateString()}</p>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
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
                  onClick={() => handleRejectResearcher(pr)}
                >
                  Reject
                </Button>
              </div>
            </div>
          ))}
        </Card>
      )}

      <Card title="Moderation queue">
        {loading && <p className="ch-dash-empty">Loading flagged listings…</p>}
        {!loading && reports.length === 0 && (
          <p className="ch-dash-empty">No flagged listings at the moment. All clean!</p>
        )}
        {reports.map((m) => (
          <div className="ch-row" key={m.id}>
            <div>
              <p className="ch-row__title">"{m.service_title}"</p>
              <p className="ch-row__meta">
                Flagged by @{m.reporter_username} • Reason: <em>{m.reason}</em>
              </p>
            </div>
            <div className="ch-mod-actions">
              <Button
                variant="secondary"
                className="ch-btn-danger"
                disabled={actioningReportId === m.id}
                onClick={() => handleTakeDownListing(m)}
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

      <div className="ch-lower-row">
        <Card title="User management">
          {loading && <p className="ch-dash-empty">Loading…</p>}
          {error && <p className="ch-dash-empty ch-dash-empty--error">{error}</p>}
          {!loading && !error && users.length === 0 && <p className="ch-dash-empty">No users yet.</p>}
          {users.map((u) => (
            <div className="ch-row" key={u.id}>
              <div>
                <p className="ch-row__title">{u.username}</p>
                <p className="ch-row__meta">{u.email}</p>
              </div>
              <div className="ch-role-control">
                <StatusChip label={ROLE_LABEL[u.role] || u.role} tone={u.role === "admin" ? "warning" : "positive"} />
                <select
                  className="ch-role-select"
                  value={u.role}
                  disabled={updatingId === u.id || deletingId === u.id}
                  onChange={(e) => handleRoleChange(u.id, e.target.value)}
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
                  disabled={deletingId === u.id}
                  onClick={() => handleDeleteUser(u)}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </Card>

        <Card title="Send announcement">
          <form className="ch-announce" onSubmit={handleSendAnnouncement}>
            <span className="ch-field-block__label">Audience</span>
            <div className="ch-announce__row">
              {["All members", "Researchers", "Admins only"].map((a) => (
                <Chip key={a} label={a} active={audience === a} onClick={() => setAudience(a)} />
              ))}
            </div>
            <Field
              label={null}
              id="announcement"
              as="textarea"
              placeholder="Network maintenance planned for Thursday 2–4pm…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            {announceFeedback && <p className="ch-announce-success">{announceFeedback}</p>}
            <Button type="submit" variant="accent" disabled={!message.trim() || sending}>
              {sending ? "Broadcasting…" : "Send announcement"}
            </Button>
          </form>
        </Card>
      </div>
    </DesktopLayout>
  );
}

