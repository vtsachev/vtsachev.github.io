import { CATEGORY_META } from "../lib/overlap";

export function Legend() {
  return (
    <div className="legend">
      {Object.entries(CATEGORY_META).map(([category, meta]) => (
        <div key={category} className="legend-item">
          <span className="legend-swatch" style={{ background: meta.color }} />
          <span>{meta.label}</span>
        </div>
      ))}
      <div className="legend-item">
        <span className="legend-dot" />
        <span>Best overlap</span>
      </div>
      <div className="legend-item">
        <span className="legend-now" />
        <span>Current time</span>
      </div>
    </div>
  );
}
