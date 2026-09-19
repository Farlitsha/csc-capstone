import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import MobileLayout from "../layouts/MobileLayout";
import PieChart from "../components/PieChart";
import BarChart from "../components/BarChart";
import Button from "../components/Button";
import Icon from "../components/Icon";
import Spinner from "../components/Spinner";
import { useAuth } from "../auth/AuthContext";
import { useLanguage } from "../i18n/LanguageContext";
import GuestAuthModal from "../components/GuestAuthModal";
import { api } from "../lib/api";
import "./CommunityStatsPage.css";

export default function CommunityStatsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [stats, setStats] = useState(null);
  const [hasUserResponse, setHasUserResponse] = useState(false);
  const [loading, setLoading] = useState(true);
  const [guestModalOpen, setGuestModalOpen] = useState(false);
  const [guestModalAction, setGuestModalAction] = useState("");

  useEffect(() => {
    Promise.all([
      api.getCensusStats().catch(() => null),
      user ? api.getMyCensus().catch(() => null) : Promise.resolve(null),
    ])
      .then(([statsData, myCensus]) => {
        if (statsData) setStats(statsData);
        if (myCensus) setHasUserResponse(true);
      })
      .finally(() => setLoading(false));
  }, [user]);

  return (
    <MobileLayout title={t("stats.title")} onBack={() => navigate(-1)}>
      <div className="ch-stats-page">
        <div className="ch-stats-header">
          <div className="ch-stats-header-text">
            <h2>{t("stats.heading")}</h2>
            <p>{t("stats.subheading")}</p>
          </div>
        </div>

        {loading ? (
          <Spinner label={t("stats.loading")} size="lg" />
        ) : !stats || stats.total_respondents === 0 ? (
          <div className="ch-stats-empty-box">
            <div className="ch-stats-empty-icon">
              <Icon name="chart" size={36} style={{ color: "var(--color-teal-700)" }} />
            </div>
            <h3>{t("stats.emptyTitle")}</h3>
            <p>{t("stats.emptyDesc")}</p>
            {user ? (
              <Link to="/community-census">
                <Button variant="accent">
                  <Icon name="clipboard" size={14} style={{ marginRight: 6 }} />
                  {t("stats.answerCensus")}
                </Button>
              </Link>
            ) : (
              <Button
                variant="accent"
                onClick={() => {
                  setGuestModalAction("answer the census survey");
                  setGuestModalOpen(true);
                }}
              >
                <Icon name="clipboard" size={14} style={{ marginRight: 6 }} />
                {t("stats.answerCensus")}
              </Button>
            )}
          </div>
        ) : (
          <div className="ch-stats-content">
            {/* Key KPI summary cards */}
            <div className="ch-kpi-grid">
              <div className="ch-kpi-card">
                <span className="ch-kpi-label">TOTAL PARTICIPANTS</span>
                <span className="ch-kpi-val">{stats.total_respondents}</span>
                <span className="ch-kpi-sub">Verified residents</span>
              </div>
              <div className="ch-kpi-card ch-kpi-card--warning">
                <span className="ch-kpi-label">JOB SEEKING RATE</span>
                <span className="ch-kpi-val">{stats.unemployment_rate}%</span>
                <span className="ch-kpi-sub">Seeking employment</span>
              </div>
              <div className="ch-kpi-card ch-kpi-card--danger">
                <span className="ch-kpi-label">POVERTY RATE INDICATOR</span>
                <span className="ch-kpi-val">{stats.poverty_rate}%</span>
                <span className="ch-kpi-sub">&lt; R3,500 / month</span>
              </div>
            </div>

            {/* Chart 1: Employment Status (Pie Chart) */}
            <PieChart
              title={
                <>
                  <Icon name="briefcase" size={16} style={{ marginRight: 6 }} />
                  Employment Status Distribution
                </>
              }
              data={stats.employment_distribution}
              donut={true}
              size={190}
            />

            {/* Chart 2: Household Income & Poverty Rate (Donut / Pie Chart) */}
            <PieChart
              title={
                <>
                  <Icon name="currency" size={16} style={{ marginRight: 6 }} />
                  Monthly Household Income Brackets (Census)
                </>
              }
              data={stats.income_distribution}
              donut={true}
              size={190}
              colors={["#ef4444", "#f97316", "#f59e0b", "#10b981", "#06b6d4", "#3b82f6"]}
            />

            {/* Chart 3: Top Skills & Job Interests in Community (Bar Chart) */}
            <BarChart
              title={
                <>
                  <Icon name="tools" size={16} style={{ marginRight: 6 }} />
                  Top Job Skills & Talents in Community
                </>
              }
              data={stats.top_skills}
              colors={["#0d9488", "#0284c7", "#6366f1", "#8b5cf6", "#d946ef", "#f43f5e"]}
            />

            {/* Chart 4: Education Level (Bar Chart) */}
            <BarChart
              title={
                <>
                  <Icon name="graduation" size={16} style={{ marginRight: 6 }} />
                  Highest Level of Education
                </>
              }
              data={stats.education_distribution}
              colors={["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"]}
            />

            {/* Chart 5: Job Hunting Support Needs (Bar Chart) */}
            <BarChart
              title={
                <>
                  <Icon name="support" size={16} style={{ marginRight: 6 }} />
                  Job Hunting & Work Support Needed
                </>
              }
              data={stats.top_support_needs}
              colors={["#f97316", "#eab308", "#14b8a6", "#06b6d4", "#a855f7"]}
            />


            <div className="ch-stats-footer-card">
              <h3>{t("stats.footerTitle")}</h3>
              <p>{t("stats.footerDesc")}</p>
              {user ? (
                <Link to="/community-census">
                  <Button variant="secondary">
                    {hasUserResponse ? t("stats.reviewMyResponses") : t("stats.addMyInput")}
                  </Button>
                </Link>
              ) : (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setGuestModalAction("participate in the community census survey");
                    setGuestModalOpen(true);
                  }}
                >
                  {t("stats.addMyInput")}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      <GuestAuthModal
        isOpen={guestModalOpen}
        onClose={() => setGuestModalOpen(false)}
        actionName={guestModalAction}
      />
    </MobileLayout>
  );
}

