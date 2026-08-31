import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MobileLayout from "../layouts/MobileLayout";
import StatusChip from "../components/StatusChip";
import { api } from "../lib/api";

export default function AnnouncementsPage() {
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .listAnnouncements()
      .then(setAnnouncements)
      .catch(() => setAnnouncements([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <MobileLayout title="Announcements" onBack={() => navigate(-1)}>
      <div className="ch-messages-container">
        <div className="ch-messages-head">
          <h2>Community Announcements</h2>
        </div>

        {loading && <p style={{ color: "var(--color-sage)", fontSize: "13px" }}>Loading announcements…</p>}

        {!loading && announcements.length === 0 && (
          <div className="ch-messages-empty">
            <h3>No announcements yet</h3>
            <p>Admin broadcasts and platform updates will appear here.</p>
          </div>
        )}

        <div className="ch-announcements-list">
          {announcements.map((a) => (
            <div className="ch-announcement-card" key={a.id}>
              <div className="ch-announcement-card__top">
                <StatusChip label={`To: ${a.audience}`} tone="warning" />
                <span className="ch-announcement-card__date">
                  {new Date(a.created_at).toLocaleDateString()}
                </span>
              </div>
              <p className="ch-announcement-card__body">{a.content}</p>
              <div className="ch-announcement-card__footer">
                <span>
                  Broadcast by <strong>@{a.author_username}</strong>
                </span>
                <span>Admin</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </MobileLayout>
  );
}


