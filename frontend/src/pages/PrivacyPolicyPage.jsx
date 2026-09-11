import { useNavigate } from "react-router-dom";
import MobileLayout from "../layouts/MobileLayout";
import Card from "../components/Card";
import Button from "../components/Button";
import Icon from "../components/Icon";
import "./PrivacyPolicyPage.css";

export default function PrivacyPolicyPage() {
  const navigate = useNavigate();

  return (
    <MobileLayout title="Privacy Policy" onBack={() => navigate(-1)}>
      <div className="ch-legal-page">
        <div className="ch-legal-hero">
          <div className="ch-legal-hero__badge">
            <Icon name="info" size={16} />
            <span>POPIA Data Privacy Compliance</span>
          </div>
          <h1>Privacy Policy</h1>
          <p className="ch-legal-hero__updated">
            Effective Date: September 2026 | Compliant with South Africa's POPIA (Act No. 4 of 2013)
          </p>
        </div>

        <Card title="1. Our Commitment to Privacy">
          <p className="ch-legal-text">
            <strong>CommHub</strong> respects your fundamental right to privacy. We process personal information strictly in accordance with South Africa's <strong>Protection of Personal Information Act (POPIA)</strong> and applicable data protection principles.
          </p>
          <p className="ch-legal-text">
            This policy outlines what data we collect, how it is used to deliver community services, how we safeguard it, and your legal rights as a data subject.
          </p>
        </Card>

        <Card title="2. Information We Collect (Data Minimization)">
          <p className="ch-legal-text">
            We practice strict <em>data minimization</em> — collecting only what is strictly necessary for platform functionality:
          </p>
          <ul className="ch-legal-list">
            <li>
              <strong>Account Identity:</strong> Full Name / Display Name and a secure 5-digit PIN (hashed and salted; never stored in plaintext).
            </li>
            <li>
              <strong>Contact Details (Optional):</strong> Phone / WhatsApp number or Email, used solely for direct communication when posting services or applying to studies.
            </li>
            <li>
              <strong>Community Listings & Media:</strong> Service descriptions, categories, and optional photos uploaded by you to promote local work.
            </li>
            <li>
              <strong>Voluntary Research & Census Data:</strong> Responses to community surveys or census questionnaires, which are aggregated and anonymized.
            </li>
          </ul>
        </Card>

        <Card title="3. Purpose of Processing">
          <p className="ch-legal-text">
            Your personal information is collected and processed solely for the following legitimate purposes:
          </p>
          <ul className="ch-legal-list">
            <li>Connecting local community service providers with local clients.</li>
            <li>Enabling community members to voluntarily discover and participate in verified academic research studies and skills workshops.</li>
            <li>Generating aggregated, anonymous community statistics to identify community needs.</li>
            <li>Investigating reported abuse or fraudulent activity to maintain community safety.</li>
          </ul>
        </Card>

        <Card title="4. Cookies & Local Storage Disclosure">
          <div className="ch-legal-callout">
            <Icon name="check" size={18} />
            <div>
              <strong>Zero Tracking Guarantee:</strong> CommHub does not use third-party tracking cookies, behavioral ad trackers, or analytics pixels.
            </div>
          </div>
          <p className="ch-legal-text">
            We use your browser's <code>localStorage</code> exclusively for:
          </p>
          <ul className="ch-legal-list">
            <li>
              <strong>Authentication:</strong> Securely holding your session token so you stay logged in.
            </li>
            <li>
              <strong>Offline Caching:</strong> Storing recent service listings and workshop data on your device so the app continues working during load shedding or mobile network outages.
            </li>
          </ul>
        </Card>

        <Card title="5. Data Sharing & Third Parties">
          <p className="ch-legal-text">
            <strong>We never sell, rent, or trade your personal information.</strong>
          </p>
          <p className="ch-legal-text">
            Your phone/WhatsApp number is only visible to community members when you publish a public service listing or submit a direct application to an authorized researcher.
          </p>
        </Card>

        <Card title="6. Your Legal Rights Under POPIA">
          <p className="ch-legal-text">
            As a data subject under South African law, you have the right to:
          </p>
          <ul className="ch-legal-list">
            <li>
              <strong>Right to Access:</strong> View all profile and contact information stored in your account at any time via the <em>Profile</em> page.
            </li>
            <li>
              <strong>Right to Rectification:</strong> Edit or correct your name, phone number, bio, or service listings directly.
            </li>
            <li>
              <strong>Right to Erasure (Deletion):</strong> Delete your listings or request full account deletion.
            </li>
            <li>
              <strong>Right to Object & Withdraw Consent:</strong> Withdraw your consent for research study participation at any time.
            </li>
          </ul>
        </Card>

        <Card title="7. Security Safeguards">
          <ul className="ch-legal-list">
            <li>All communication with backend servers is encrypted using standard HTTPS/TLS protocols.</li>
            <li>User PINs are cryptographically hashed using PBKDF2/bcrypt.</li>
            <li>Uploaded images are sanitized and validated to prevent malicious payloads.</li>
          </ul>
        </Card>

        <Card title="8. Responsible Party & Project Details">
          <p className="ch-legal-text">
            <strong>Responsible Entity:</strong> CommHub Community Engagement Project (University Final Year Capstone Project, Western Cape, South Africa).
          </p>
          <p className="ch-legal-text">
            If you have questions regarding this policy or wish to submit a POPIA data request, please contact the platform administration through your community coordinator or via the platform profile settings.
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
