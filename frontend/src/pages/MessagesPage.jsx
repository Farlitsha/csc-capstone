import { useNavigate } from "react-router-dom";
import MobileLayout from "../layouts/MobileLayout";

export default function MessagesPage() {
  const navigate = useNavigate();
  return (
    <MobileLayout title="Messages" onBack={() => navigate(-1)}>
      <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--color-sage)" }}>
        <p>Messaging is coming soon.</p>
      </div>
    </MobileLayout>
  );
}
