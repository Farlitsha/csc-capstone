import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MobileLayout from "../layouts/MobileLayout";
import StatusChip from "../components/StatusChip";
import { useLanguage } from "../i18n/LanguageContext";
import { api } from "../lib/api";

export default function AnnouncementsPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
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
    <MobileLayout title={t("announcements.title")} onBack={() => navigate(-1)}>
      <div className="ch-messages-container">
        <div className="ch-messages-head">
          <h2>{t("announcements.heading")}</h2>
        </div>

        {loading && <p style={{ color: "var(--color-sage)", fontSize: "13px" }}>{t("announcements.loading")}</p>}

        {!loading && announcements.length === 0 && (
          <div className="ch-messages-empty">
            <h3>{t("announcements.emptyTitle")}</h3>
            <p>{t("announcements.emptyDesc")}</p>
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
                  {t("announcements.broadcastBy")} <strong>@{a.author_username}</strong>
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


