import "./Button.css";

/**
 * Figma: Design System / Button (node 7:23)
 * variant: "primary" (teal fill) | "accent" (orange fill) | "secondary" (outline) | "danger" (red fill) | "danger-outline" (red outline)
 */
export default function Button({
  children,
  variant = "primary",
  type = "button",
  fullWidth = false,
  disabled = false,
  onClick,
  className = "",
  ...rest
}) {
  const variantClass = `ch-button--${variant}`;
  const fullClass = fullWidth ? " ch-button--full" : "";
  const customClass = className ? ` ${className}` : "";

  return (
    <button
      type={type}
      className={`ch-button ${variantClass}${fullClass}${customClass}`}
      disabled={disabled}
      onClick={onClick}
      {...rest}
    >
      {children}
    </button>
  );
}

