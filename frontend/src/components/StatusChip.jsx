import "./StatusChip.css";

/**
 * Status Chip Component
 * tone: "positive" | "warning" | "neutral" | "danger"
 */
export default function StatusChip({ label, tone = "positive", icon }) {
  const symbol = icon !== undefined ? icon : null;

  return (
    <span className={`ch-status-chip ch-status-chip--${tone}`} role="status">
      {symbol && <span className="ch-status-chip__icon" aria-hidden="true">{symbol}</span>}
      <span className="ch-status-chip__label">{label}</span>
    </span>
  );
}

