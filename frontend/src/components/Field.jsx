import "./Field.css";

/** Labeled text input matching the Figma "Input" pattern used across forms. */
export default function Field({
  label,
  id,
  as = "input",
  className = "",
  ...rest
}) {
  const Tag = as;
  return (
    <label className={`ch-field ${className}`} htmlFor={id}>
      {label && <span className="ch-field__label">{label}</span>}
      <Tag id={id} className="ch-field__input" {...rest} />
    </label>
  );
}
