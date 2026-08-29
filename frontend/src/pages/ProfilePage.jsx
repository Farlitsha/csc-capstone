import { useState } from "react";
import { useNavigate } from "react-router-dom";
import MobileLayout from "../layouts/MobileLayout";
import Card from "../components/Card";
import Button from "../components/Button";
import StatusChip from "../components/StatusChip";
import { api, ApiError } from "../lib/api";
import { useAuth } from "../auth/AuthContext";
import { useLanguage } from "../i18n/LanguageContext";
import "./ProfilePage.css";

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, logout, refreshUser } = useAuth();
  const { t } = useLanguage();
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const ROLE_LABEL = {
    community_member: t("profile.roleCommunityMember"),
    researcher: t("profile.roleResearcher"),
    admin: t("profile.roleAdmin"),
  };

  async function requestRole(role) {
    setUpdating(true);
    setMessage("");
    setError("");
    try {
      await api.updateUserRole(user.id, role);
      await refreshUser();
      setMessage(`You're now a ${ROLE_LABEL[role].toLowerCase()}.`);
    } catch (err) {
      // Most common case once a real admin exists: the backend correctly refuses
      // self-promotion and tells you to ask an existing admin instead.
      setError(err instanceof ApiError ? err.detail : "Could not update your role.");
    } finally {
      setUpdating(false);
    }
  }

  return (
    <MobileLayout title={t("profile.heading")} onBack={() => navigate(-1)}>
      <div className="ch-profile">
        <Card title={t("profile.account")}>
          <div className="ch-profile__details">
            <div>
              <span className="ch-profile__label">{t("profile.username")}</span>
              <p className="ch-profile__value">{user?.username || "—"}</p>
            </div>
            <div>
              <span className="ch-profile__label">{t("profile.role")}</span>
              <StatusChip label={ROLE_LABEL[user?.role] || user?.role || "—"} tone={user?.role === "admin" ? "warning" : "positive"} />
            </div>
          </div>
        </Card>

        {user?.role !== "admin" && (
          <Card title={t("profile.accessCardTitle")}>
            <div className="ch-profile__roles">
              <p className="ch-profile__hint">{t("profile.hint")}</p>
              <div className="ch-profile__role-buttons">
                <Button variant="secondary" disabled={updating || user?.role === "researcher"} onClick={() => requestRole("researcher")}>
                  {user?.role === "researcher" ? t("profile.alreadyResearcher") : t("profile.becomeResearcher")}
                </Button>
                <Button variant="accent" disabled={updating} onClick={() => requestRole("admin")}>
                  {t("profile.becomeAdmin")}
                </Button>
              </div>
              {message && <p className="ch-profile__success">{message}</p>}
              {error && <p className="ch-profile__error">{error}</p>}
            </div>
          </Card>
        )}

        <Button variant="secondary" fullWidth onClick={logout}>
          {t("common.logout")}
        </Button>
      </div>
    </MobileLayout>
  );
}
