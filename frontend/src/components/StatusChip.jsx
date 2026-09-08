import "./StatusChip.css";

const DEFAULT_ICONS = {
  positive: "✓",
  warning: "⏳",
  danger: "✕",
  neutral: "•",
};

/**
 * Figma: Design System / Status Chip (node 7:16)
 * WCAG 2.1 AA Compliant: Pairs color with distinct text icon so information
 * is never conveyed by color alone.
 * tone: "positive" | "warning" | "neutral" | "danger"
 */
export default function StatusChip({ label, tone = "positive", icon }) {
  const symbol = icon !== undefined ? icon : (DEFAULT_ICONS[tone] || "•");

  return (
    <span className={`ch-status-chip ch-status-chip--${tone}`} role="status">
      {symbol && <span className="ch-status-chip__icon" aria-hidden="true">{symbol}</span>}
      <span className="ch-status-chip__label">{label}</span>
    </span>
  );
}

