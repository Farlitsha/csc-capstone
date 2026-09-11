import { useNavigate } from "react-router-dom";
import MobileLayout from "../layouts/MobileLayout";
import Card from "../components/Card";
import Button from "../components/Button";
import Icon from "../components/Icon";
import "./TermsPage.css";

export default function TermsPage() {
  const navigate = useNavigate();

  return (
    <MobileLayout title="Terms & Conditions" onBack={() => navigate(-1)}>
      <div className="ch-legal-page">
        <div className="ch-legal-hero">
          <div className="ch-legal-hero__badge">
            <Icon name="document" size={16} />
            <span>Community Guidelines & Terms</span>
          </div>
          <h1>Terms & Conditions</h1>
          <p className="ch-legal-hero__updated">Effective Date: September 2026 | CommHub Platform</p>
        </div>

        <Card title="1. Platform Scope & Purpose">
          <p className="ch-legal-text">
            <strong>CommHub</strong> is a free community-driven digital platform designed to connect local residents,
            independent service providers, and verified academic researchers in South African communities (including Ocean View and Khayelitsha).
          </p>
          <p className="ch-legal-text">
            By creating an account, browsing listings, offering services, or participating in research studies, you agree to comply with and be bound by these Terms & Conditions.
          </p>
        </Card>

        <Card title="2. User Accounts & PIN Security">
          <ul className="ch-legal-list">
            <li>
              <strong>Credential Safety:</strong> You are responsible for safeguarding your 5-digit PIN and login credentials. CommHub will never ask for your PIN via phone or WhatsApp.
            </li>
            <li>
              <strong>Truthful Representation:</strong> You agree to provide accurate, honest information on your profile and directory posts. Impersonation of other persons or organizations is strictly prohibited.
            </li>
            <li>
              <strong>Shared Devices:</strong> If you access CommHub from a shared family or community center device, remember to log out after completing your session.
            </li>
          </ul>
        </Card>

        <Card title="3. Community Services & Peer-to-Peer Transactions">
          <div className="ch-legal-callout">
            <Icon name="info" size={18} />
            <div>
              <strong>Important Disclaimer:</strong> CommHub is a connection directory, not an employer, contractor, or commercial broker.
            </div>
          </div>
          <ul className="ch-legal-list">
            <li>
              <strong>Independent Arrangements:</strong> All job quotes, timelines, service terms, payments, and work quality agreements are negotiated directly between the service seeker and the service provider (via WhatsApp, phone, or in person).
            </li>
            <li>
              <strong>Limitation of Liability:</strong> CommHub, its student developers, and university affiliates bear no liability for unfinished work, property damages, personal injuries, or payment disputes arising from services arranged through the platform.
            </li>
            <li>
              <strong>Safety Precautions:</strong> We encourage users to verify details and exercise standard safety precautions when hiring or offering in-person services.
            </li>
          </ul>
        </Card>

        <Card title="4. Academic Research & Survey Participation">
          <ul className="ch-legal-list">
            <li>
              <strong>Voluntary Participation:</strong> All participation in academic studies, focus groups, and surveys is 100% voluntary. You may decline or withdraw from any study at any time without penalty.
            </li>
            <li>
              <strong>Researcher Ethics:</strong> Verified researchers are required to maintain institutional ethics approval, ensure participant confidentiality, and clearly state study objectives.
            </li>
            <li>
              <strong>Informed Consent:</strong> Submitting an application or survey through CommHub acts as voluntary informed consent for that specific academic research scope.
            </li>
          </ul>
        </Card>

        <Card title="5. Community Workshops & Events">
          <ul className="ch-legal-list">
            <li>
              <strong>Registration:</strong> Workshop seats are allocated on a first-come, first-served basis according to venue capacity limits.
            </li>
            <li>
              <strong>Cancellations:</strong> If you can no longer attend a workshop you registered for, please cancel your registration to free the seat for another community member.
            </li>
            <li>
              <strong>Code of Conduct:</strong> Participants and organizers are expected to treat all attendees with dignity, respect, and constructive engagement.
            </li>
          </ul>
        </Card>

        <Card title="6. Prohibited Conduct & Community Safety">
          <p className="ch-legal-text">
            To keep CommHub safe and welcoming for everyone, the following activities are strictly prohibited:
          </p>
          <ul className="ch-legal-list">
            <li>Posting illegal goods, hazardous services, adult content, or fraudulent schemes.</li>
            <li>Harassment, hate speech, abusive language, or discrimination of any kind.</li>
            <li>Spamming, automated data scraping, or attempting to compromise platform security.</li>
          </ul>
          <p className="ch-legal-text">
            <strong>Moderation Authority:</strong> Platform administrators investigate community reports submitted via the <em>Report Service</em> feature and reserve the right to remove non-compliant listings and suspend or permanently terminate violating accounts.
          </p>
        </Card>

        <Card title="7. POPIA Privacy & Data Rights">
          <p className="ch-legal-text">
            Your personal information is protected under South Africa’s Protection of Personal Information Act (POPIA).
            Community census statistics and analytics are strictly aggregated and anonymized. Please review our full <a href="/privacy" className="ch-legal-inline-link">Privacy Policy</a> for detailed information on your data rights.
          </p>
        </Card>

        <Card title="8. Disclaimers & 'As-Is' Service">
          <p className="ch-legal-text">
            CommHub, including its offline caching features, is provided on an "as-is" and "as-available" basis.
            While we strive for high reliability and offline resilience, the platform makes no guarantees of uninterrupted connectivity or immediate data synchronization under low-bandwidth network conditions.
          </p>
        </Card>

        <div className="ch-legal-actions">
          <Button variant="secondary" fullWidth onClick={() => navigate(-1)}>
            ← Go Back
          </Button>
        </div>
      </div>
    </MobileLayout>
  );
}
