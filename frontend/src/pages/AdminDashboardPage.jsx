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

// Moderation queue and mass-message aren't backed by endpoints yet - illustrative
// content matching the Figma sample data, kept separate from the real user list below.
const MODERATION_QUEUE = [
  { id: 1, title: `"Quick cash loans" listing`, meta: "Flagged by 3 members — possible scam" },
  { id: 2, title: "Unverified electrician listing", meta: "No contact details provided" },
];

const ROLE_LABEL = {
  community_member: "Community member",
  researcher: "Researcher",
  admin: "Admin",
};
const ROLES = ["community_member", "researcher", "admin"];

export default function AdminDashboardPage() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [audience, setAudience] = useState("All members");
  const [message, setMessage] = useState("");

  function loadUsers() {
    setLoading(true);
    api
      .listUsers()
      .then(setUsers)
      .catch(() => setError("Could not load users from the server."))
      .finally(() => setLoading(false));
  }

  useEffect(loadUsers, []);

  async function handleRoleChange(userId, role) {
    setUpdatingId(userId);
    try {
      const updated = await api.updateUserRole(userId, role);
      setUsers((list) => list.map((u) => (u.id === userId ? updated : u)));
    } catch (err) {
      alert(err instanceof ApiError ? err.detail : "Could not update this user's role.");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <DesktopLayout eyebrow="ADMIN CONSOLE">
      <div className="ch-desktop__heading">
        <h1>Platform overview</h1>
        <p>Ocean View iNethi Community Hub</p>
      </div>

      <div className="ch-stats-row">
        <StatCard label="TOTAL USERS" value={String(users.length)} />
        <StatCard label="RESEARCHERS" value={String(users.filter((u) => u.role === "researcher").length)} />
        <StatCard label="FLAGGED LISTINGS" value={String(MODERATION_QUEUE.length)} />
        <StatCard label="ADMINS" value={String(users.filter((u) => u.role === "admin").length)} />
      </div>

      <Card title="Moderation queue">
        {MODERATION_QUEUE.map((m) => (
          <div className="ch-row" key={m.id}>
            <div>
              <p className="ch-row__title">{m.title}</p>
              <p className="ch-row__meta">{m.meta}</p>
            </div>
            <Button variant="secondary">Review</Button>
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
                  disabled={updatingId === u.id}
                  onChange={(e) => handleRoleChange(u.id, e.target.value)}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABEL[r]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </Card>

        <Card title="Send announcement">
          <div className="ch-announce">
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
            <Button variant="accent" disabled={!message.trim()}>
              Send announcement
            </Button>
          </div>
        </Card>
      </div>
    </DesktopLayout>
  );
}
