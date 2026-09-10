import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import MobileLayout from "../layouts/MobileLayout";
import PieChart from "../components/PieChart";
import BarChart from "../components/BarChart";
import Button from "../components/Button";
import Icon from "../components/Icon";
import Spinner from "../components/Spinner";
import { api } from "../lib/api";
import "./CommunityStatsPage.css";

export default function CommunityStatsPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [hasUserResponse, setHasUserResponse] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getCensusStats().catch(() => null),
      api.getMyCensus().catch(() => null),
    ])
      .then(([statsData, myCensus]) => {
        if (statsData) setStats(statsData);
        if (myCensus) setHasUserResponse(true);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <MobileLayout title="Community Insights" onBack={() => navigate(-1)}>
      <div className="ch-stats-page">
        <div className="ch-stats-header">
          <div className="ch-stats-header-text">
            <h2>Ocean View Census & Job Insights</h2>
            <p>
              Aggregated demographic data, employment statistics, poverty rates, and community skill profiles.
            </p>
          </div>
          <Link to="/community-census" className="ch-stats-cta-link">
            <Button variant="accent">
              {hasUserResponse ? (
                <>
                  <Icon name="edit" size={14} style={{ marginRight: 6 }} />
                  Update My Answers
                </>
              ) : (
                <>
                  <Icon name="clipboard" size={14} style={{ marginRight: 6 }} />
                  Take Census Survey
                </>
              )}
            </Button>
          </Link>
        </div>

        {loading ? (
          <Spinner label="Loading community statistics…" size="lg" />
        ) : !stats || stats.total_respondents === 0 ? (
          <div className="ch-stats-empty-box">
            <div className="ch-stats-empty-icon">
              <Icon name="chart" size={36} style={{ color: "var(--color-teal-700)" }} />
            </div>
            <h3>No Census Data Yet</h3>
            <p>Be the first member to share your information and help shape community insights.</p>
            <Link to="/community-census">
              <Button variant="accent">
                <Icon name="clipboard" size={14} style={{ marginRight: 6 }} />
                Answer Census Survey
              </Button>
            </Link>
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
              <h3>Help make this data more accurate</h3>
              <p>Your responses help local leaders, researchers, and NGOs allocate resources where they are needed most.</p>
              <Link to="/community-census">
                <Button variant="secondary">
                  {hasUserResponse ? "Review My Responses" : "Add My Input to the Census"}
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </MobileLayout>
  );
}

