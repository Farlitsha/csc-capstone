import "./StatusChip.css";

/**
 * Figma: Design System / Status Chip (node 7:16)
 * tone: "positive" | "warning" | "neutral"
 */
export default function StatusChip({ label, tone = "positive" }) {
  return <span className={`ch-status-chip ch-status-chip--${tone}`}>{label}</span>;
}
