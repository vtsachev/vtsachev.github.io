import { useEffect, useMemo, useRef, useState } from "react";
import { normalizeTimezoneSearchQuery } from "../data/timezones";
import { getTimezoneEntryKey } from "../data/timezoneCatalog";
import { formatOffsetLabel } from "../lib/timezone";
import { REGION_OPTIONS, SOURCE_LABEL } from "../lib/geo";

const POPULAR_LIMIT = 16;
const REGION_BROWSE_LIMIT = 300;
const SEARCH_LIMIT = 25;

// Pick the nicest catalog entry for a given IANA tz (curated > capital > any).
function pickBestEntryForTz(timezoneData, tz) {
  const matches = timezoneData.filter((entry) => entry.tz === tz);
  if (matches.length === 0) {
    return null;
  }
  return matches.slice().sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99))[0];
}

export function TimezoneSearch({
  timezoneData,
  zones,
  onAddZone,
  now,
  maxZones = 5,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [regionFilter, setRegionFilter] = useState(null);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  const canAddMore = zones.length < maxZones;
  const selectedZoneKeys = useMemo(
    () => new Set(zones.map((zone) => getTimezoneEntryKey(zone))),
    [zones],
  );

  const localTz = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    } catch {
      return "";
    }
  }, []);

  const localEntry = useMemo(
    () => (localTz ? pickBestEntryForTz(timezoneData, localTz) : null),
    [localTz, timezoneData],
  );

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (!wrapperRef.current?.contains(event.target)) {
        setIsOpen(false);
        setQuery("");
        setRegionFilter(null);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const compact = normalizeTimezoneSearchQuery(normalized);

    // Region browse (chip selected): show that region's countries + capitals.
    if (regionFilter) {
      const inRegion = timezoneData.filter(
        (item) => item.isBrowsable && item.region === regionFilter,
      );
      const scoped = normalized
        ? inRegion.filter(
            (item) =>
              item.searchRaw.includes(normalized) ||
              (compact && item.searchCompact.includes(compact)),
          )
        : inRegion;
      return scoped
        .slice()
        .sort((a, b) => a.city.localeCompare(b.city))
        .slice(0, REGION_BROWSE_LIMIT);
    }

    // No query, no region: curated shortlist.
    if (!normalized) {
      return timezoneData
        .filter((item) => item.isPopular)
        .sort((a, b) => a.city.localeCompare(b.city))
        .slice(0, POPULAR_LIMIT);
    }

    // Free-text search across the whole catalog.
    return timezoneData
      .map((item) => {
        const city = item.city.toLowerCase();
        const tz = item.tz.toLowerCase();
        let score = Number.POSITIVE_INFINITY;

        if (city === normalized || tz === normalized) {
          score = 0;
        } else if (city.startsWith(normalized) || tz.startsWith(normalized)) {
          score = 1;
        } else if (item.searchRaw.includes(normalized)) {
          score = 2;
        } else if (compact && item.searchCompact.includes(compact)) {
          score = 3;
        }

        return { item, score };
      })
      .filter((entry) => Number.isFinite(entry.score))
      .sort((a, b) => {
        if (a.score !== b.score) return a.score - b.score;
        if ((a.item.rank ?? 99) !== (b.item.rank ?? 99)) {
          return (a.item.rank ?? 99) - (b.item.rank ?? 99);
        }
        return a.item.city.localeCompare(b.item.city);
      })
      .slice(0, SEARCH_LIMIT)
      .map((entry) => entry.item);
  }, [query, regionFilter, timezoneData]);

  const addFromCandidate = (candidate, alreadyAdded) => {
    if (alreadyAdded || !candidate) {
      return;
    }
    onAddZone(candidate);
    setIsOpen(false);
    setQuery("");
    setRegionFilter(null);
  };

  const findFirstAddableCandidate = () =>
    filtered.find(
      (candidate) => !selectedZoneKeys.has(getTimezoneEntryKey(candidate)),
    );

  const localAlreadyAdded =
    localEntry && selectedZoneKeys.has(getTimezoneEntryKey(localEntry));

  return (
    <div ref={wrapperRef} className="timezone-search">
      {!isOpen ? (
        <button
          type="button"
          className="timezone-search-trigger"
          onClick={() => canAddMore && setIsOpen(true)}
          disabled={!canAddMore}
        >
          {canAddMore
            ? `+ Add timezone (${zones.length}/${maxZones})`
            : `Maximum ${maxZones} timezones reached`}
        </button>
      ) : (
        <div className="timezone-search-panel">
          <input
            ref={inputRef}
            type="text"
            className="timezone-search-input"
            placeholder="Search city, country, IANA, UTC+/-N — or browse by region below"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setIsOpen(false);
                setQuery("");
                setRegionFilter(null);
                return;
              }
              if (event.key === "Enter" && filtered.length > 0) {
                const first = findFirstAddableCandidate();
                if (!first) return;
                addFromCandidate(
                  first,
                  selectedZoneKeys.has(getTimezoneEntryKey(first)),
                );
              }
            }}
          />

          <div className="timezone-search-toolbar">
            <div
              className="region-chips"
              role="group"
              aria-label="Browse by region"
            >
              <button
                type="button"
                className={`region-chip${regionFilter === null ? " is-active" : ""}`}
                onClick={() => setRegionFilter(null)}
              >
                All
              </button>
              {REGION_OPTIONS.map((region) => (
                <button
                  key={region}
                  type="button"
                  className={`region-chip${regionFilter === region ? " is-active" : ""}`}
                  onClick={() => setRegionFilter(region)}
                >
                  {region}
                </button>
              ))}
            </div>
            {localEntry && (
              <button
                type="button"
                className="use-my-tz"
                onClick={() => addFromCandidate(localEntry, localAlreadyAdded)}
                disabled={localAlreadyAdded}
                title={`Your timezone: ${localEntry.tz}`}
              >
                📍 {localAlreadyAdded ? "Your timezone added" : "Use my timezone"}
              </button>
            )}
          </div>

          <div className="timezone-search-results">
            {filtered.length === 0 && (
              <div className="timezone-search-empty">
                No matching timezone. Additions are limited to known, valid zones.
              </div>
            )}
            {filtered.map((candidate) => {
              const alreadyAdded = selectedZoneKeys.has(
                getTimezoneEntryKey(candidate),
              );
              const offsetLabel = formatOffsetLabel(candidate.tz, now);
              const badge = SOURCE_LABEL[candidate.source] || "";

              return (
                <button
                  type="button"
                  key={`${candidate.city}-${candidate.tz}`}
                  className="timezone-result-item"
                  onClick={() => addFromCandidate(candidate, alreadyAdded)}
                  disabled={alreadyAdded}
                >
                  <span className="result-flag" aria-hidden="true">
                    {candidate.flag || "🕓"}
                  </span>
                  <span className="result-main">
                    <span className="result-title">
                      <strong>{candidate.city}</strong>
                      {badge && (
                        <span
                          className={`result-badge badge-${candidate.source}`}
                        >
                          {badge}
                        </span>
                      )}
                    </span>
                    <small>{candidate.country}</small>
                  </span>
                  <em>
                    {candidate.tz} · {offsetLabel}
                  </em>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
