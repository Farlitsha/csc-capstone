import "./Card.css";

/** Generic white panel with heading, used for dashboard sections. */
export default function Card({ title, action, children, className = "" }) {
  return (
    <section className={`ch-card ${className}`}>
      {(title || action) && (
        <div className="ch-card__head">
          {title && <h3 className="ch-card__title">{title}</h3>}
          {action}
        </div>
      )}
      <div className="ch-card__body">{children}</div>
    </section>
  );
}
