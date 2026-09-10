import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MobileLayout from "../layouts/MobileLayout";
import Button from "../components/Button";
import Chip from "../components/Chip";
import Icon from "../components/Icon";
import { api, ApiError } from "../lib/api";
import "./CommunityCensusPage.css";


const EMPLOYMENT_OPTIONS = [
  "Employed (Full-Time)",
  "Employed (Part-Time / Casual)",
  "Self-Employed / Entrepreneur",
  "Job Seeker (Unemployed)",
  "Student / In Training",
  "Homemaker / Caregiver",
  "Retired",
];

const INCOME_OPTIONS = [
  "Under R1,500",
  "R1,500 - R3,500",
  "R3,501 - R6,000",
  "R6,001 - R12,000",
  "R12,001 - R25,000",
  "Over R25,000",
];

const EDUCATION_OPTIONS = [
  "Primary School",
  "Some High School (Grades 8-11)",
  "Matric / Grade 12",
  "Vocational / TVET Certificate",
  "Diploma or Degree",
];

const SKILLS_OPTIONS = [
  "Carpentry & Construction",
  "Plumbing & Electrical",
  "Cooking & Catering",
  "Retail & Cashiering",
  "Childcare & Domestic",
  "Driving & Delivery",
  "Computer & Digital Skills",
  "Caregiving & Healthcare",
  "Administration & Office",
  "Security & Safety",
  "Artisan & Crafts",
  "Gardening & Landscaping",
];

const SUPPORT_NEEDS_OPTIONS = [
  "Ready to work immediately",
  "Need CV / Resume writing help",
  "Need internet / computer access",
  "Need interview preparation",
  "Looking for apprenticeship / learnership",
  "Want skills training courses",
  "Need transport assistance",
];

export default function CommunityCensusPage() {
  const navigate = useNavigate();
  const [employmentStatus, setEmploymentStatus] = useState("");
  const [incomeBracket, setIncomeBracket] = useState("");
  const [educationLevel, setEducationLevel] = useState("");
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [selectedNeeds, setSelectedNeeds] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    api
      .getMyCensus()
      .then((data) => {
        if (data) {
          setEmploymentStatus(data.employment_status || "");
          setIncomeBracket(data.income_bracket || "");
          setEducationLevel(data.education_level || "");
          setSelectedSkills(data.job_skills || []);
          setSelectedNeeds(data.job_support_needs || []);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function toggleSkill(skill) {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  }

  function toggleNeed(need) {
    setSelectedNeeds((prev) =>
      prev.includes(need) ? prev.filter((n) => n !== need) : [...prev, need]
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!employmentStatus || !incomeBracket || !educationLevel) {
      setError("Please answer the required questions to help our community statistics.");
      return;
    }

    setError("");
    setSaving(true);

    try {
      await api.submitCensus({
        employment_status: employmentStatus,
        income_bracket: incomeBracket,
        education_level: educationLevel,
        job_skills: selectedSkills,
        job_support_needs: selectedNeeds,
      });

      setSavedSuccess(true);
      setTimeout(() => {
        navigate("/community-stats");
      }, 1200);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Could not submit census response.");
      setSaving(false);
    }
  }

  return (
    <MobileLayout title="Community Census" onBack={() => navigate(-1)}>
      <div className="ch-census-page">
        <div className="ch-census-header">
          <h2>Community Census & Job Survey</h2>
          <p>
            Help Ocean View identify employment trends, skills, and community needs.
            Responses are kept confidential and aggregated into community statistics.
          </p>
          <div className="ch-census-voluntary-notice">
            <Icon name="info" size={16} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>
              <strong>POPIA & Voluntary Notice:</strong> Taking this community census survey is purely optional and voluntary. You are never forced or required to complete this survey to browse or use CommHub.
            </span>
          </div>
        </div>

        {loading ? (
          <p className="ch-census-loading">Loading your details…</p>
        ) : (
          <form className="ch-census-form" onSubmit={handleSubmit}>
            {error && <div className="ch-census-error">{error}</div>}
            {savedSuccess && (
              <div className="ch-census-success">
                <Icon name="check" size={15} style={{ marginRight: 6 }} />
                Thank you! Your responses have been recorded. Redirecting to community stats…
              </div>
            )}


            {/* 1. Employment Status */}
            <div className="ch-census-card">
              <label className="ch-census-label">
                <span className="ch-census-num">1</span> What is your current employment status? <span className="ch-req">*</span>
              </label>
              <div className="ch-chip-grid">
                {EMPLOYMENT_OPTIONS.map((opt) => (
                  <Chip
                    key={opt}
                    label={opt}
                    active={employmentStatus === opt}
                    onClick={() => setEmploymentStatus(opt)}
                  />
                ))}
              </div>
            </div>

            {/* 2. Household Income Bracket */}
            <div className="ch-census-card">
              <label className="ch-census-label">
                <span className="ch-census-num">2</span> Monthly Household Income Bracket <span className="ch-req">*</span>
              </label>
              <span className="ch-census-hint">Used to calculate community poverty & resource allocation indicators</span>
              <div className="ch-chip-grid">
                {INCOME_OPTIONS.map((opt) => (
                  <Chip
                    key={opt}
                    label={opt}
                    active={incomeBracket === opt}
                    onClick={() => setIncomeBracket(opt)}
                  />
                ))}
              </div>
            </div>

            {/* 3. Highest Education */}
            <div className="ch-census-card">
              <label className="ch-census-label">
                <span className="ch-census-num">3</span> Highest Level of Education <span className="ch-req">*</span>
              </label>
              <div className="ch-chip-grid">
                {EDUCATION_OPTIONS.map((opt) => (
                  <Chip
                    key={opt}
                    label={opt}
                    active={educationLevel === opt}
                    onClick={() => setEducationLevel(opt)}
                  />
                ))}
              </div>
            </div>

            {/* 4. Skills & Job Sectors */}
            <div className="ch-census-card">
              <label className="ch-census-label">
                <span className="ch-census-num">4</span> Your Skills & Job Interests
              </label>
              <span className="ch-census-hint">Select all that apply to help match local opportunities</span>
              <div className="ch-chip-grid">
                {SKILLS_OPTIONS.map((opt) => (
                  <Chip
                    key={opt}
                    label={opt}
                    active={selectedSkills.includes(opt)}
                    onClick={() => toggleSkill(opt)}
                  />
                ))}
              </div>
            </div>

            {/* 5. Support Needs */}
            <div className="ch-census-card">
              <label className="ch-census-label">
                <span className="ch-census-num">5</span> What would help you most with job hunting?
              </label>
              <span className="ch-census-hint">Select all that apply</span>
              <div className="ch-chip-grid">
                {SUPPORT_NEEDS_OPTIONS.map((opt) => (
                  <Chip
                    key={opt}
                    label={opt}
                    active={selectedNeeds.includes(opt)}
                    onClick={() => toggleNeed(opt)}
                  />
                ))}
              </div>
            </div>

            <div className="ch-census-actions">
              <Button type="submit" variant="accent" disabled={saving || savedSuccess}>
                {saving ? "Submitting…" : "Save & View Community Stats"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </MobileLayout>
  );
}

