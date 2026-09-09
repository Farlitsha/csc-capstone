import "./Charts.css";

const DEFAULT_COLORS = [
  "#0d9488", // teal-600
  "#3b82f6", // blue-500
  "#f59e0b", // amber-500
  "#8b5cf6", // purple-500
  "#ec4899", // pink-500
  "#10b981", // emerald-500
  "#06b6d4", // cyan-500
];

export default function BarChart({ data = [], title, colors = DEFAULT_COLORS, showPercentage = true }) {
  if (!data || data.length === 0) {
    return (
      <div className="ch-chart-empty">
        <p>No data recorded yet.</p>
      </div>
    );
  }

  const maxCount = Math.max(...data.map((d) => d.count || 0), 1);

  return (
    <div className="ch-chart-container" role="region" aria-label={title || "Bar chart"}>
      {title && <h3 className="ch-chart-title">{title}</h3>}

      {/* Screen-reader accessible data table fallback */}
      <table className="sr-only">
        <caption>{title ? `${title} data distribution` : "Bar chart data distribution"}</caption>
        <thead>
          <tr>
            <th scope="col">Category</th>
            <th scope="col">Count</th>
            {showPercentage && <th scope="col">Percentage</th>}
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr key={item.label}>
              <th scope="row">{item.label}</th>
              <td>{item.count}</td>
              {showPercentage && <td>{item.percentage !== undefined ? `${item.percentage}%` : "—"}</td>}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="ch-bar-list" aria-hidden="true">
        {data.map((item, idx) => {
          const color = colors[idx % colors.length];
          const barWidth = Math.max(((item.count || 0) / maxCount) * 100, 4);

          return (
            <div key={item.label} className="ch-bar-row">
              <div className="ch-bar-header">
                <span className="ch-bar-label">{item.label}</span>
                <span className="ch-bar-value">
                  <strong>{item.count}</strong>
                  {showPercentage && item.percentage !== undefined && (
                    <small> ({item.percentage}%)</small>
                  )}
                </span>
              </div>
              <div className="ch-bar-track">
                <div
                  className="ch-bar-fill"
                  style={{
                    width: `${barWidth}%`,
                    backgroundColor: color,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

