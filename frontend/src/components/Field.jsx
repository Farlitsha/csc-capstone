import { useId } from "react";
import "./Field.css";

/** Labeled text input matching the Figma "Input" pattern used across forms with full a11y associations. */
export default function Field({
  label,
  id,
  error,
  hint,
  as = "input",
  className = "",
  required,
  ...rest
}) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const errorId = error ? `${inputId}-error` : undefined;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;
  const Tag = as;

  return (
    <div className={`ch-field ${error ? "ch-field--error" : ""} ${className}`}>
      {label && (
        <label className="ch-field__label" htmlFor={inputId}>
          {label}
          {required && <span className="ch-field__required" aria-hidden="true"> *</span>}
        </label>
      )}
      {hint && (
        <span id={hintId} className="ch-field__hint">
          {hint}
        </span>
      )}
      <Tag
        id={inputId}
        className="ch-field__input"
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        {...rest}
      />
      {error && (
        <span id={errorId} className="ch-field__error-msg" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
