import { useId, useState } from "react";
import Icon from "./Icon";
import "./Field.css";

/** Labeled text input matching the Figma "Input" pattern used across forms with full a11y associations. */
export default function Field({
  label,
  id,
  type = "text",
  error,
  hint,
  as = "input",
  className = "",
  required,
  ...rest
}) {
  const [revealed, setRevealed] = useState(false);
  const generatedId = useId();
  const inputId = id || generatedId;
  const errorId = error ? `${inputId}-error` : undefined;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;
  const Tag = as;

  const isPassword = type === "password";
  const effectiveType = isPassword ? (revealed ? "text" : "password") : type;

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
      <div className="ch-field__input-wrapper">
        <Tag
          id={inputId}
          type={effectiveType}
          className={`ch-field__input ${isPassword ? "ch-field__input--password" : ""}`}
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          {...rest}
        />
        {isPassword && (
          <button
            type="button"
            className="ch-field__toggle-visibility"
            onClick={() => setRevealed((r) => !r)}
            aria-label={revealed ? "Hide PIN" : "Show PIN"}
            title={revealed ? "Hide PIN" : "Show PIN"}
          >
            <Icon name={revealed ? "eye-off" : "eye"} size={18} />
          </button>
        )}
      </div>
      {error && (
        <span id={errorId} className="ch-field__error-msg" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
