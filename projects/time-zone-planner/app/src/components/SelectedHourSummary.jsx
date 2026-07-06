import { useState } from "react";
import { CATEGORY_META } from "../lib/overlap";
import { copyText } from "../lib/share";

export function SelectedHourSummary({
  selectedUtcLabel,
  selectedDetails,
  onClear,
}) {
  const [copied, setCopied] = useState(false);

  if (!selectedDetails) {
    return null;
  }

  const handleCopy = async () => {
    const text = [
      `Selected time — ${selectedUtcLabel} UTC`,
      ...selectedDetails.map((item) => `${item.city}: ${item.timeLabel}`),
    ].join("\n");
    const ok = await copyText(text);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    }
  };

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

      <div className="selected-summary-actions">
        <button type="button" className="window-action" onClick={handleCopy}>
          {copied ? "✓ Copied" : "Copy"}
        </button>
        <button type="button" className="clear-selection" onClick={onClear}>
          Clear
        </button>
      </div>
    </section>
  );
}
