import { useMemo } from "react";
import { HourCell } from "./HourCell";
import { getHourCategory } from "../lib/overlap";
import {
  formatDateInZone,
  formatCurrentTimeInZone,
  formatOffsetLabel,
  formatTimeOfDay,
  formatWeekdayInZone,
  getDateAtUtcHour,
  getLocalDateKey,
  getLocalMinutesOfDay,
} from "../lib/timezone";

export function TimezoneRow({
  zone,
  now,
  timelineStartUtc,
  selectedUtcHour,
  bestHourSet,
  canRemove,
  onSelectHour,
  onRemove,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDragging,
  isDropTarget,
  showCurrentMarker = true,
}) {
  const slotData = useMemo(
    () =>
      Array.from({ length: 24 }, (_, utcHour) => {
        const utcDate = getDateAtUtcHour(timelineStartUtc, utcHour);
        const localMinutes = getLocalMinutesOfDay(zone.tz, utcDate);
        const localDateKey = getLocalDateKey(zone.tz, utcDate);
        const localWeekday = formatWeekdayInZone(zone.tz, utcDate);

        return {
          utcHour,
          localMinutes,
          localDateKey,
          localWeekday,
          category: getHourCategory(localMinutes),
          label: formatTimeOfDay(localMinutes),
        };
      }),
    [timelineStartUtc, zone.tz],
  );

  const timelineStartDate = getDateAtUtcHour(timelineStartUtc, 0);
  const timelineEndDate = getDateAtUtcHour(timelineStartUtc, 24);
  const daySpanStart = formatWeekdayInZone(zone.tz, timelineStartDate);
  const daySpanEnd = formatWeekdayInZone(zone.tz, timelineEndDate);
  const daySpanLabel =
    daySpanStart === daySpanEnd ? daySpanStart : `${daySpanStart} -> ${daySpanEnd}`;

  const currentUtcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const currentMarkerLeft = `${(currentUtcMinutes / 1440) * 100}%`;

  return (
    <div
      className={`timezone-row${isDragging ? " is-dragging" : ""}${
        isDropTarget ? " is-drop-target" : ""
      }`}
      draggable
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move";
        onDragStart(zone.id);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        onDragOver(zone.id);
      }}
      onDrop={(event) => {
        event.preventDefault();
        onDrop(zone.id);
      }}
      onDragEnd={onDragEnd}
    >
      <div className="timezone-row-meta">
        <div className="timezone-row-top">
          <span className="timezone-row-city">{zone.city}</span>
          <button
            type="button"
            className="remove-zone-button"
            disabled={!canRemove}
            onClick={() => onRemove(zone.id)}
            title={canRemove ? "Remove timezone" : "At least 2 zones are required"}
            aria-label={`Remove ${zone.city}`}
          >
            ×
          </button>
        </div>
        <div className="timezone-row-subtitle">
          <span>{zone.tz}</span>
        </div>
        <div className="timezone-row-subtitle">
          <span>{formatOffsetLabel(zone.tz, now)}</span>
          <span className="dot-separator">•</span>
          <span>{formatCurrentTimeInZone(zone.tz, now)} now</span>
          <span className="dot-separator">•</span>
          <span>{formatDateInZone(zone.tz, now)}</span>
        </div>
        <div className="timezone-row-subtitle timezone-row-day-span">
          <span>Grid day span: {daySpanLabel}</span>
        </div>
      </div>

      <div className="timezone-row-grid">
        {showCurrentMarker && (
          <div
            className="current-time-marker"
            style={{ left: currentMarkerLeft }}
            aria-hidden="true"
          />
        )}
        {slotData.map((slot, index) => {
          const previous = index > 0 ? slotData[index - 1] : null;
          const showDayMarker =
            index === 0 || previous?.localDateKey !== slot.localDateKey;

          return (
            <HourCell
              key={`${zone.id}-${slot.utcHour}`}
              label={slot.label}
              dayLabel={showDayMarker ? slot.localWeekday : null}
              category={slot.category}
              isSelected={selectedUtcHour === slot.utcHour}
              isBestHour={bestHourSet.has(slot.utcHour)}
              onClick={() => onSelectHour(slot.utcHour)}
            />
          );
        })}
      </div>
    </div>
  );
}
