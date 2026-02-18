import { useCallback, useMemo, useRef, useState } from "react";
import { BestOverlapSummary } from "./components/BestOverlapSummary";
import { Legend } from "./components/Legend";
import { SelectedHourSummary } from "./components/SelectedHourSummary";
import { TimezoneRow } from "./components/TimezoneRow";
import { TimezoneSearch } from "./components/TimezoneSearch";
import { TIMEZONE_DATA, isKnownTimezoneEntry } from "./data/timezones";
import { computeOverlap, getHourCategory } from "./lib/overlap";
import { useInternetClock } from "./lib/internetClock";
import {
  addDaysToDateKey,
  formatCurrentTimeInZone,
  formatDateInZone,
  formatOffsetLabel,
  formatTimeInZoneAtDate,
  formatTimeOfDay,
  getDateAtUtcHour,
  getLocalDateKey,
  getLocalMinutesOfDay,
  getUtcTimestampForZoneDateStart,
  isValidTimezoneIdentifier,
} from "./lib/timezone";
import "./App.css";

const MIN_ZONES = 2;
const MAX_ZONES = 5;

const INITIAL_ZONES = [
  {
    id: 1,
    city: "San Francisco",
    tz: "America/Los_Angeles",
    country: "United States",
  },
  {
    id: 2,
    city: "New York",
    tz: "America/New_York",
    country: "United States",
  },
];

export default function App() {
  const [zones, setZones] = useState(INITIAL_ZONES);
  const [selectedDayOffset, setSelectedDayOffset] = useState(0);
  const [selectedUtcHour, setSelectedUtcHour] = useState(null);
  const [draggedZoneId, setDraggedZoneId] = useState(null);
  const [dropTargetZoneId, setDropTargetZoneId] = useState(null);
  const nextIdRef = useRef(3);

  const {
    now,
    source: clockSource,
    hasInternetSync,
    lastSyncedAtMs,
    lastError,
    syncClock,
  } = useInternetClock();

  const anchorZone = zones[0];
  const anchorTodayKey = useMemo(
    () => getLocalDateKey(anchorZone.tz, now),
    [anchorZone.tz, now],
  );

  const dateOptions = useMemo(() => {
    return Array.from({ length: 14 }, (_, offset) => {
      const dateKey = addDaysToDateKey(anchorTodayKey, offset);
      const utcTimestamp = getUtcTimestampForZoneDateStart(anchorZone.tz, dateKey);
      const dateAtZoneMidnight = new Date(utcTimestamp);

      return {
        offset,
        dateKey,
        label: formatDateInZone(anchorZone.tz, dateAtZoneMidnight, {
          weekday: "short",
          month: "numeric",
          day: "numeric",
        }),
        fullLabel: formatDateInZone(anchorZone.tz, dateAtZoneMidnight, {
          weekday: "short",
          month: "short",
          day: "numeric",
        }),
      };
    });
  }, [anchorTodayKey, anchorZone.tz]);

  const selectedDate =
    dateOptions.find((option) => option.offset === selectedDayOffset) || dateOptions[0];

  const timelineStartUtc = useMemo(() => {
    if (!selectedDate) {
      return getUtcTimestampForZoneDateStart(anchorZone.tz, anchorTodayKey);
    }

    return getUtcTimestampForZoneDateStart(anchorZone.tz, selectedDate.dateKey);
  }, [anchorTodayKey, anchorZone.tz, selectedDate]);

  const overlap = useMemo(
    () => computeOverlap(zones, timelineStartUtc),
    [zones, timelineStartUtc],
  );

  const bestHourSet = useMemo(
    () => new Set(overlap.bestUtcHours),
    [overlap.bestUtcHours],
  );

  const selectedDetails = useMemo(() => {
    if (selectedUtcHour === null) {
      return null;
    }

    const selectedDateTime = getDateAtUtcHour(timelineStartUtc, selectedUtcHour);

    return zones.map((zone) => {
      const localMinutes = getLocalMinutesOfDay(zone.tz, selectedDateTime);

      return {
        id: zone.id,
        city: zone.city,
        timeLabel: formatTimeInZoneAtDate(zone.tz, selectedDateTime),
        category: getHourCategory(localMinutes),
      };
    });
  }, [selectedUtcHour, timelineStartUtc, zones]);

  const selectedUtcLabel = useMemo(() => {
    if (selectedUtcHour === null) {
      return "";
    }

    const selectedDateTime = getDateAtUtcHour(timelineStartUtc, selectedUtcHour);
    return formatTimeInZoneAtDate("UTC", selectedDateTime);
  }, [selectedUtcHour, timelineStartUtc]);

  const zoneClockDetails = useMemo(
    () =>
      zones.map((zone) => ({
        id: zone.id,
        city: zone.city,
        currentTime: formatCurrentTimeInZone(zone.tz, now),
        currentDate: formatDateInZone(zone.tz, now),
        offsetLabel: formatOffsetLabel(zone.tz, now),
      })),
    [zones, now],
  );

  const addZone = useCallback((candidate) => {
    setZones((current) => {
      if (current.length >= MAX_ZONES) {
        return current;
      }

      if (!candidate || !isKnownTimezoneEntry(candidate)) {
        return current;
      }

      if (!isValidTimezoneIdentifier(candidate.tz)) {
        return current;
      }

      if (
        current.some(
          (zone) => zone.city === candidate.city && zone.tz === candidate.tz,
        )
      ) {
        return current;
      }

      const nextZone = { ...candidate, id: nextIdRef.current };
      nextIdRef.current += 1;
      return [...current, nextZone];
    });
  }, []);

  const removeZone = useCallback((id) => {
    setZones((current) => {
      if (current.length <= MIN_ZONES) {
        return current;
      }

      return current.filter((zone) => zone.id !== id);
    });
  }, []);

  const handleDrop = useCallback(
    (targetId) => {
      if (draggedZoneId === null) {
        return;
      }

      setZones((current) => {
        const fromIndex = current.findIndex((zone) => zone.id === draggedZoneId);
        const toIndex = current.findIndex((zone) => zone.id === targetId);

        if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
          return current;
        }

        const reordered = [...current];
        const [moved] = reordered.splice(fromIndex, 1);
        reordered.splice(toIndex, 0, moved);
        return reordered;
      });

      setDraggedZoneId(null);
      setDropTargetZoneId(null);
    },
    [draggedZoneId],
  );

  const canRemove = zones.length > MIN_ZONES;

  return (
    <div className="app-shell">
      <main className="planner">
        <header className="app-header">
          <div>
            <h1>Timezone Overlap Finder</h1>
            <p>
              Plan meetings across {zones.length} timezones. Drag rows to reorder,
              click any column to compare local times, and use the yellow markers for
              top overlap.
            </p>
          </div>

          <aside className="clock-card" aria-live="polite">
            <span className="clock-card-label">Current times ({zones.length})</span>
            <div className="clock-zone-list">
              {zoneClockDetails.map((zoneClock) => (
                <div key={zoneClock.id} className="clock-zone-item">
                  <span className="clock-zone-city">{zoneClock.city}</span>
                  <span className="clock-zone-time">{zoneClock.currentTime}</span>
                  <small className="clock-zone-meta">
                    {zoneClock.currentDate} · {zoneClock.offsetLabel}
                  </small>
                </div>
              ))}
            </div>
            <small>
              {clockSource}
              {hasInternetSync && lastSyncedAtMs
                ? ` · synced ${formatTimeInZoneAtDate("UTC", new Date(lastSyncedAtMs))}`
                : ""}
            </small>
            {lastError && <small className="clock-card-error">Sync error: {lastError}</small>}
            <button type="button" className="clock-refresh-button" onClick={syncClock}>
              Sync now
            </button>
          </aside>
        </header>

        <Legend />

        <section className="date-picker" aria-label="Timeline date selector">
          <div className="date-picker-header">
            <span>
              Timeline date anchored to top zone: <strong>{anchorZone.city}</strong>
            </span>
            <span>
              Selected: <strong>{selectedDate?.fullLabel}</strong>
            </span>
          </div>
          <div className="date-picker-list">
            {dateOptions.map((option) => (
              <button
                key={option.dateKey}
                type="button"
                className={`date-pill${option.offset === selectedDayOffset ? " is-active" : ""}`}
                onClick={() => {
                  setSelectedDayOffset(option.offset);
                  setSelectedUtcHour(null);
                }}
              >
                <span>{option.label}</span>
                {option.offset === 0 && <em>Today</em>}
              </button>
            ))}
          </div>
        </section>

        <section className="timeline-wrap">
          <div className="timeline-hours-row">
            <div className="timezone-meta-spacer">
              <span>Rows are draggable</span>
            </div>
            <div className="timeline-hours-grid">
              {Array.from({ length: 24 }, (_, hour) => (
                <span key={`utc-hour-${hour}`}>{formatTimeOfDay(hour * 60)}</span>
              ))}
            </div>
          </div>

          {zones.map((zone) => (
            <TimezoneRow
              key={zone.id}
              zone={zone}
              now={now}
              timelineStartUtc={timelineStartUtc}
              selectedUtcHour={selectedUtcHour}
              bestHourSet={bestHourSet}
              canRemove={canRemove}
              onSelectHour={setSelectedUtcHour}
              onRemove={removeZone}
              onDragStart={setDraggedZoneId}
              onDragOver={setDropTargetZoneId}
              onDrop={handleDrop}
              onDragEnd={() => {
                setDraggedZoneId(null);
                setDropTargetZoneId(null);
              }}
              isDragging={draggedZoneId === zone.id}
              isDropTarget={dropTargetZoneId === zone.id && draggedZoneId !== zone.id}
              showCurrentMarker={selectedDayOffset === 0}
            />
          ))}
        </section>

        <SelectedHourSummary
          selectedUtcLabel={selectedUtcLabel}
          selectedDetails={selectedDetails}
          onClear={() => setSelectedUtcHour(null)}
        />

        <TimezoneSearch
          timezoneData={TIMEZONE_DATA}
          zones={zones}
          onAddZone={addZone}
          now={now}
          maxZones={MAX_ZONES}
        />

        <BestOverlapSummary
          zones={zones}
          bestUtcHours={overlap.bestUtcHours}
          timelineStartUtc={timelineStartUtc}
          mode={overlap.mode}
        />
      </main>
    </div>
  );
}
