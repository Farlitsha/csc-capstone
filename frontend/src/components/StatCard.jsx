import "./StatCard.css";

/** Figma: Design System / Stat Card (node 7:7) */
export default function StatCard({ label, value }) {
  return (
    <div className="ch-stat-card">
      <p className="ch-stat-card__label">{label}</p>
      <p className="ch-stat-card__value">{value}</p>
    </div>
  );
}
