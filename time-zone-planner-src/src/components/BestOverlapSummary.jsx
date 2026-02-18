import { useMemo } from "react";
import { groupConsecutiveHours } from "../lib/overlap";
import { formatTimeInZoneAtDate, getDateAtUtcHour } from "../lib/timezone";

function formatWindowLabel(startDate, endDate) {
  const start = formatTimeInZoneAtDate("UTC", startDate);
  const end = formatTimeInZoneAtDate("UTC", endDate);
  return `${start} - ${end} UTC`;
}

export function BestOverlapSummary({ zones, bestUtcHours, timelineStartUtc, mode }) {
  const grouped = useMemo(() => groupConsecutiveHours(bestUtcHours), [bestUtcHours]);

  if (grouped.length === 0) {
    return null;
  }

  return (
    <section className="best-overlap-summary">
      <header className="best-overlap-title">
        <h2>Best Meeting Windows</h2>
        <p>
          {mode === "all-core"
            ? "All zones are in core hours for these windows."
            : "No full all-core overlap; these are the best available windows."}
        </p>
      </header>

      <div className="best-overlap-cards">
        {grouped.map((group) => {
          const startDate = getDateAtUtcHour(timelineStartUtc, group.start);
          const endDate = getDateAtUtcHour(timelineStartUtc, group.end + 1);

          return (
            <article
              className="best-overlap-card"
              key={`${group.start}-${group.end}`}
            >
              <h3>{formatWindowLabel(startDate, endDate)}</h3>
              {zones.map((zone) => {
                const startLabel = formatTimeInZoneAtDate(zone.tz, startDate);
                const endLabel = formatTimeInZoneAtDate(zone.tz, endDate);

                return (
                  <p key={`${zone.id}-${group.start}`}>
                    <strong>{zone.city}</strong>
                    <span>
                      {startLabel} - {endLabel}
                    </span>
                  </p>
                );
              })}
            </article>
          );
        })}
      </div>
    </section>
  );
}
