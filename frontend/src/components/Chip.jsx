import "./Chip.css";

/** Small pill used for category filters / selectable tags (not a status chip). */
export default function Chip({ label, active = false, onClick, as = "button" }) {
  const Tag = as;
  return (
    <Tag
      type={as === "button" ? "button" : undefined}
      className={`ch-chip${active ? " ch-chip--active" : ""}`}
      onClick={onClick}
    >
      {label}
    </Tag>
  );
}
