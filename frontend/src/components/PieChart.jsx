import { useState } from "react";
import "./Charts.css";

const DEFAULT_COLORS = [
  "#0d9488", // teal-600
  "#f59e0b", // amber-500
  "#3b82f6", // blue-500
  "#ec4899", // pink-500
  "#8b5cf6", // purple-500
  "#10b981", // emerald-500
  "#f97316", // orange-500
  "#64748b", // slate-500
  "#06b6d4", // cyan-500
  "#84cc16", // lime-500
];

export default function PieChart({ data = [], title, size = 150, donut = true, colors = DEFAULT_COLORS }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div className="ch-chart-empty">
        <p>No data recorded yet.</p>
      </div>
    );
  }

  const total = data.reduce((sum, d) => sum + (d.count || 0), 0);

  if (total === 0) {
    return (
      <div className="ch-chart-empty">
        <p>No responses recorded yet.</p>
      </div>
    );
  }

  const radius = size / 2;
  const strokeWidth = donut ? 36 : radius;
  const innerRadius = radius - strokeWidth / 2;
  const circumference = 2 * Math.PI * innerRadius;

  let cumulativeAngle = 0;

  const slices = data.map((item, idx) => {
    const percentage = item.percentage !== undefined ? item.percentage : (item.count / total) * 100;
    const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
    const strokeDashoffset = -cumulativeAngle * (circumference / 360);
    const color = colors[idx % colors.length];

    cumulativeAngle += (percentage / 100) * 360;

    return {
      ...item,
      color,
      percentage,
      strokeDasharray,
      strokeDashoffset,
      idx,
    };
  });

  const activeItem = hoveredIdx !== null ? slices[hoveredIdx] : null;

  return (
    <div className="ch-chart-container">
      {title && <h3 className="ch-chart-title">{title}</h3>}
      <div className="ch-pie-wrapper">
        <div className="ch-pie-svg-box" style={{ width: size, height: size }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="ch-pie-svg">
            <g transform={`rotate(-90 ${radius} ${radius})`}>
              {slices.map((slice) => (
                <circle
                  key={slice.label}
                  cx={radius}
                  cy={radius}
                  r={innerRadius}
                  fill="transparent"
                  stroke={slice.color}
                  strokeWidth={hoveredIdx === slice.idx ? strokeWidth + 4 : strokeWidth}
                  strokeDasharray={slice.strokeDasharray}
                  strokeDashoffset={slice.strokeDashoffset}
                  className="ch-pie-slice"
                  onMouseEnter={() => setHoveredIdx(slice.idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                />
              ))}
            </g>
          </svg>

          {donut && (
            <div className="ch-pie-center">
              <span className="ch-pie-center-val">
                {activeItem ? `${activeItem.percentage}%` : `${total}`}
              </span>
              <span className="ch-pie-center-lbl">
                {activeItem ? activeItem.label : "Total"}
              </span>
            </div>
          )}
        </div>

        <div className="ch-chart-legend">
          {slices.map((slice) => (
            <div
              key={slice.label}
              className={`ch-legend-item ${hoveredIdx === slice.idx ? "ch-legend-item--active" : ""}`}
              onMouseEnter={() => setHoveredIdx(slice.idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              <span className="ch-legend-dot" style={{ backgroundColor: slice.color }} />
              <span className="ch-legend-label">{slice.label}</span>
              <span className="ch-legend-value">
                <strong>{slice.count}</strong> ({slice.percentage}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

