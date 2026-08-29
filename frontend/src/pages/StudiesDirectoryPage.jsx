import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MobileLayout from "../layouts/MobileLayout";
import StatusChip from "../components/StatusChip";
import Chip from "../components/Chip";
import Button from "../components/Button";
import { api, ApiError } from "../lib/api";
import { useLanguage } from "../i18n/LanguageContext";
import "./StudiesDirectoryPage.css";

const STATE_TONE = { live: "positive", draft: "neutral", closed: "warning" };
const APPLICATION_TONE = { applied: "neutral", accepted: "positive", declined: "danger" };

export default function StudiesDirectoryPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [tab, setTab] = useState("open");

  const [studies, setStudies] = useState([]);
  const [studiesLoading, setStudiesLoading] = useState(true);
  const [studiesError, setStudiesError] = useState("");
  const [applyingId, setApplyingId] = useState(null);
  const [appliedIds, setAppliedIds] = useState([]);

  const [myApplications, setMyApplications] = useState([]);
  const [myAppsLoading, setMyAppsLoading] = useState(true);
  const [myAppsError, setMyAppsError] = useState("");

  const APPLICATION_LABEL = {
    applied: t("studies.statusApplied"),
    accepted: t("studies.statusAccepted"),
    declined: t("studies.statusDeclined"),
  };

  useEffect(() => {
    api
      .listStudies()
      .then(setStudies)
      .catch(() => setStudiesError("Could not load studies from the server."))
      .finally(() => setStudiesLoading(false));
  }, []);

  function loadMyApplications() {
    setMyAppsLoading(true);
    api
      .getMyApplications()
      .then(setMyApplications)
      .catch(() => setMyAppsError("Could not load your applications."))
      .finally(() => setMyAppsLoading(false));
  }

  useEffect(() => {
    if (tab === "mine") loadMyApplications();
  }, [tab]);

  async function handleApply(studyId) {
    setApplyingId(studyId);
    try {
      await api.applyToStudy(studyId);
      setAppliedIds((ids) => [...ids, studyId]);
    } catch (err) {
      alert(err instanceof ApiError ? err.detail : "Could not apply to this study.");
    } finally {
      setApplyingId(null);
    }
  }

  const liveStudies = studies.filter((s) => s.state === "live");

  return (
    <MobileLayout title={t("studies.title")} onBack={() => navigate(-1)}>
      <div className="ch-studies-tabs">
        <Chip label={t("studies.openTab")} active={tab === "open"} onClick={() => setTab("open")} />
        <Chip label={t("studies.myAppsTab")} active={tab === "mine"} onClick={() => setTab("mine")} />
      </div>

      {tab === "open" && (
        <div className="ch-studies-list">
          {studiesLoading && <p className="ch-studies-empty">{t("common.loading")}</p>}
          {studiesError && <p className="ch-studies-empty ch-studies-empty--error">{studiesError}</p>}
          {!studiesLoading && !studiesError && liveStudies.length === 0 && (
            <p className="ch-studies-empty">{t("studies.noOpen")}</p>
          )}

          {liveStudies.map((s) => {
            const applied = appliedIds.includes(s.id);
            return (
              <div className="ch-study-card" key={s.id}>
                <StatusChip label={s.state} tone={STATE_TONE[s.state] || "neutral"} />
                <h3>{s.title}</h3>
                <p>{s.description}</p>
                <div className="ch-study-card__meta">
                  {s.honorarium && <span>{s.honorarium}</span>}
                  {s.participant_limit && <span>{t("studies.limit")} {s.participant_limit} {t("studies.participants")}</span>}
                  {s.closing_date && <span>{t("studies.closes")} {new Date(s.closing_date).toLocaleDateString()}</span>}
                </div>
                <Button
                  variant={applied ? "secondary" : "accent"}
                  fullWidth
                  disabled={applyingId === s.id || applied}
                  onClick={() => handleApply(s.id)}
                >
                  {applied ? t("studies.applied") : applyingId === s.id ? t("studies.applying") : t("studies.applyButton")}
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {tab === "mine" && (
        <div className="ch-studies-list">
          {myAppsLoading && <p className="ch-studies-empty">{t("common.loading")}</p>}
          {myAppsError && <p className="ch-studies-empty ch-studies-empty--error">{myAppsError}</p>}
          {!myAppsLoading && !myAppsError && myApplications.length === 0 && (
            <p className="ch-studies-empty">{t("studies.noApplications")}</p>
          )}

          {myApplications.map((a) => (
            <div className="ch-study-card" key={a.id}>
              <StatusChip label={APPLICATION_LABEL[a.status] || a.status} tone={APPLICATION_TONE[a.status] || "neutral"} />
              <h3>{a.study_title}</h3>
              <div className="ch-study-card__meta">
                {a.study_honorarium && <span>{a.study_honorarium}</span>}
                <span>{t("studies.appliedOn")} {new Date(a.applied_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </MobileLayout>
  );
}
