import { CATEGORY_META } from "../lib/overlap";

export function SelectedHourSummary({
  selectedUtcLabel,
  selectedDetails,
  onClear,
}) {
  if (!selectedDetails) {
    return null;
  }

  return (
    <section className="selected-summary">
      <div className="selected-summary-label">
        <span>Selected</span>
        <strong>{selectedUtcLabel}</strong>
      </div>

      {selectedDetails.map((item) => (
        <div key={item.id} className="selected-summary-item">
          <span
            className="selected-summary-color"
            style={{ backgroundColor: CATEGORY_META[item.category].color }}
          />
          <span>{item.city}</span>
          <strong>{item.timeLabel}</strong>
        </div>
      ))}

      <button type="button" className="clear-selection" onClick={onClear}>
        Clear
      </button>
    </section>
  );
}
