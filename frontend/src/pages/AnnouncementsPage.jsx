import { useNavigate } from "react-router-dom";
import MobileLayout from "../layouts/MobileLayout";
import StatusChip from "../components/StatusChip";
import { useLanguage } from "../i18n/LanguageContext";
import { useAuth } from "../auth/AuthContext";
import { useUnreadNotifications } from "../lib/notifications";
import { formatTimeAgo } from "../lib/dateUtils";

export default function AnnouncementsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const {
    announcements,
    unreadCount,
    markRead,
    markAllRead,
    isNew,
    isUnread,
    loading,
  } = useUnreadNotifications(user);

  return (
    <MobileLayout title={t("announcements.title")} onBack={() => navigate(-1)}>
      <div className="ch-messages-container">
        <div className="ch-messages-head">
          <div className="ch-messages-head__left">
            <h2>{t("announcements.heading")}</h2>
            {unreadCount > 0 && (
              <span className="ch-unread-badge-counter">
                {unreadCount} unread
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              type="button"
              className="ch-mark-all-read-btn"
              onClick={markAllRead}
            >
              Mark all as read
            </button>
          )}
        </div>

        {loading && <p style={{ color: "var(--color-sage)", fontSize: "13px" }}>{t("announcements.loading")}</p>}

        {!loading && announcements.length === 0 && (
          <div className="ch-messages-empty">
            <h3>{t("announcements.emptyTitle")}</h3>
            <p>{t("announcements.emptyDesc")}</p>
          </div>
        )}

        <div className="ch-announcements-list">
          {announcements.map((a) => {
            const hasNewIndicator = isNew(a);
            const isCardUnread = isUnread(a);
            return (
              <div
                className={`ch-announcement-card${isCardUnread ? " ch-announcement-card--unread" : ""}`}
                key={a.id}
                onClick={() => isCardUnread && markRead(a.id)}
              >
                <div className="ch-announcement-card__top">
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <StatusChip label={`To: ${a.audience}`} tone="warning" />
                    {hasNewIndicator && (
                      <span className="ch-new-indicator-tag">
                        NEW
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {isCardUnread && (
                      <button
                        type="button"
                        className="ch-mark-single-read-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          markRead(a.id);
                        }}
                        title="Mark as read"
                      >
                        Mark as read
                      </button>
                    )}
                    <span className="ch-announcement-card__date" title={new Date(a.created_at).toLocaleString()}>
                      {formatTimeAgo(a.created_at) || new Date(a.created_at).toLocaleDateString()}
                    </span>
                  </div>
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


