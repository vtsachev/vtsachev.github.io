import { useMemo, useState } from "react";
import { groupConsecutiveHours } from "../lib/overlap";
import { formatTimeInZoneAtDate, getDateAtUtcHour } from "../lib/timezone";
import { buildGoogleCalendarUrl, copyText } from "../lib/share";
import { getShareUrl } from "../lib/urlState";

function formatWindowLabel(startDate, endDate) {
  const start = formatTimeInZoneAtDate("UTC", startDate);
  const end = formatTimeInZoneAtDate("UTC", endDate);
  return `${start} - ${end} UTC`;
}

function buildSummaryText(zones, startDate, endDate) {
  const lines = [`Meeting window — ${formatWindowLabel(startDate, endDate)}`];
  for (const zone of zones) {
    lines.push(
      `${zone.city}: ${formatTimeInZoneAtDate(zone.tz, startDate)} - ${formatTimeInZoneAtDate(zone.tz, endDate)}`,
    );
  }
  return lines.join("\n");
}

export function BestOverlapSummary({ zones, bestUtcHours, timelineStartUtc, mode }) {
  const grouped = useMemo(() => groupConsecutiveHours(bestUtcHours), [bestUtcHours]);
  const [copiedKey, setCopiedKey] = useState(null);

  if (grouped.length === 0) {
    return null;
  }

  const handleCopy = async (key, text) => {
    const ok = await copyText(text);
    if (ok) {
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey(null), 1800);
    }
  };

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
          const key = `${group.start}-${group.end}`;
          const summaryText = buildSummaryText(zones, startDate, endDate);
          const gcalUrl = buildGoogleCalendarUrl({
            title: `Meeting — ${zones.map((z) => z.city).join(" / ")}`,
            startMs: startDate.getTime(),
            endMs: endDate.getTime(),
            details: `${summaryText}\n\nPlanned with: ${getShareUrl()}`,
          });

          return (
            <article className="best-overlap-card" key={key}>
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
              <div className="best-overlap-actions">
                <button
                  type="button"
                  className="window-action"
                  onClick={() => handleCopy(key, summaryText)}
                >
                  {copiedKey === key ? "✓ Copied" : "Copy"}
                </button>
                <a
                  className="window-action"
                  href={gcalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Add to Google Calendar
                </a>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
