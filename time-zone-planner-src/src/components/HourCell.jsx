import { CATEGORY_META } from "../lib/overlap";

export function HourCell({
  label,
  category,
  isSelected,
  isBestHour,
  onClick,
}) {
  const meta = CATEGORY_META[category];

  return (
    <button
      type="button"
      className={`hour-cell${isSelected ? " is-selected" : ""}`}
      style={{
        backgroundColor: meta.color,
        color: meta.text,
      }}
      onClick={onClick}
      title={label}
      aria-label={`Select ${label}`}
    >
      <span className="hour-cell-label">{label}</span>
      {isBestHour && <span className="hour-cell-best" aria-hidden="true" />}
    </button>
  );
}
