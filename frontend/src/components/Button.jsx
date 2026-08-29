import "./Button.css";

/**
 * Figma: Design System / Button (node 7:23)
 * variant: "primary" (teal fill) | "accent" (orange fill) | "secondary" (outline)
 */
export default function Button({
  children,
  variant = "primary",
  type = "button",
  fullWidth = false,
  disabled = false,
  onClick,
  ...rest
}) {
  return (
    <button
      type={type}
      className={`ch-button ch-button--${variant}${fullWidth ? " ch-button--full" : ""}`}
      disabled={disabled}
      onClick={onClick}
      {...rest}
    >
      {children}
    </button>
  );
}
