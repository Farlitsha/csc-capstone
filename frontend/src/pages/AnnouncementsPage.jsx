import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import MobileLayout from "../layouts/MobileLayout";
import StatusChip from "../components/StatusChip";
import { useLanguage } from "../i18n/LanguageContext";
import { api } from "../lib/api";

export default function AnnouncementsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialLastSeenId] = useState(() => {
    return parseInt(localStorage.getItem("commhub_last_seen_announcement_id") || "0", 10);
  });

  useEffect(() => {
    api
      .listAnnouncements()
      .then(setAnnouncements)
      .catch(() => setAnnouncements([]))
      .finally(() => setLoading(false));
  }, []);

  const relevantAnnouncements = announcements.filter((a) => {
    if (!a.audience || a.audience === "All members") return true;
    if ((!user || user?.role === "community_member") && a.audience === "Community Members") return true;
    if (user?.role === "researcher" && a.audience === "Researchers") return true;
    if (user?.role === "admin") return true;
    return false;
  });

  // Mark all relevant announcements as seen on view
  useEffect(() => {
    if (relevantAnnouncements.length > 0) {
      const maxId = Math.max(...relevantAnnouncements.map((a) => a.id), 0);
      if (maxId > 0) {
        localStorage.setItem("commhub_last_seen_announcement_id", String(maxId));
      }
    }
  }, [relevantAnnouncements]);

  return (
    <MobileLayout title={t("announcements.title")} onBack={() => navigate(-1)}>
      <div className="ch-messages-container">
        <div className="ch-messages-head">
          <h2>{t("announcements.heading")}</h2>
        </div>

        {loading && <p style={{ color: "var(--color-sage)", fontSize: "13px" }}>{t("announcements.loading")}</p>}

        {!loading && relevantAnnouncements.length === 0 && (
          <div className="ch-messages-empty">
            <h3>{t("announcements.emptyTitle")}</h3>
            <p>{t("announcements.emptyDesc")}</p>
          </div>
        )}

        <div className="ch-announcements-list">
          {relevantAnnouncements.map((a) => {
            const isNew = initialLastSeenId > 0
              ? a.id > initialLastSeenId
              : (Date.now() - new Date(a.created_at).getTime()) < 3 * 86400000;

            return (
              <div className="ch-announcement-card" key={a.id}>
                <div className="ch-announcement-card__top">
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <StatusChip label={`To: ${a.audience}`} tone="neutral" />
                    {isNew && (
                      <span className="ch-announcement-new-badge">
                        {t("announcements.badge")}
                      </span>
                    )}
                  </div>
                  <span className="ch-announcement-card__date">
                    {new Date(a.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="ch-announcement-card__body">{a.content}</p>
                <div className="ch-announcement-card__footer">
                  <span>
                    {t("announcements.broadcastBy")} <strong>@{a.author_username}</strong>
                  </span>
                  <span>Admin</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </MobileLayout>
  );
}


