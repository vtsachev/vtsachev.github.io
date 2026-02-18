import { useEffect, useMemo, useRef, useState } from "react";
import { normalizeTimezoneSearchQuery } from "../data/timezones";

export function TimezoneSearch({
  timezoneData,
  zones,
  onAddZone,
  maxZones = 5,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  const canAddMore = zones.length < maxZones;

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
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const compact = normalizeTimezoneSearchQuery(normalized);

    if (!normalized) {
      return timezoneData
        .filter((item) => item.isPopular)
        .sort((a, b) => a.city.localeCompare(b.city))
        .slice(0, 16);
    }

    const scored = timezoneData
      .map((item) => {
        const searchRaw = item.searchRaw || "";
        const searchCompact = item.searchCompact || "";
        const city = item.city.toLowerCase();
        const tz = item.tz.toLowerCase();

        let score = Number.POSITIVE_INFINITY;

        if (city === normalized || tz === normalized) {
          score = 0;
        } else if (city.startsWith(normalized) || tz.startsWith(normalized)) {
          score = 1;
        } else if (searchRaw.includes(normalized)) {
          score = 2;
        } else if (compact && searchCompact.includes(compact)) {
          score = 3;
        }

        return { item, score };
      })
      .filter((entry) => Number.isFinite(entry.score))
      .sort((a, b) => {
        if (a.score !== b.score) {
          return a.score - b.score;
        }
        if ((a.item.rank || 99) !== (b.item.rank || 99)) {
          return (a.item.rank || 99) - (b.item.rank || 99);
        }
        return a.item.city.localeCompare(b.item.city);
      })
      .slice(0, 20)
      .map((entry) => entry.item);

    return scored;
  }, [query, timezoneData]);

  const addFromCandidate = (candidate, alreadyAdded) => {
    if (alreadyAdded) {
      return;
    }

    onAddZone(candidate);
    setIsOpen(false);
    setQuery("");
  };

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
            placeholder="Search city, country, IANA, UTC+/-N, GMT+/-N"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && filtered.length > 0) {
                const first = filtered[0];
                const alreadyAdded = zones.some(
                  (zone) => zone.city === first.city && zone.tz === first.tz,
                );
                addFromCandidate(first, alreadyAdded);
              }
            }}
          />
          <div className="timezone-search-results">
            {filtered.length === 0 && (
              <div className="timezone-search-empty">
                No matching timezone. Additions are limited to known, valid zones.
              </div>
            )}
            {filtered.map((candidate) => {
              const alreadyAdded = zones.some(
                (zone) => zone.city === candidate.city && zone.tz === candidate.tz,
              );

              return (
                <button
                  type="button"
                  key={`${candidate.city}-${candidate.tz}`}
                  className="timezone-result-item"
                  onClick={() => addFromCandidate(candidate, alreadyAdded)}
                  disabled={alreadyAdded}
                >
                  <span>
                    <strong>{candidate.city}</strong>
                    <small>{candidate.country}</small>
                  </span>
                  <em>{candidate.tz}</em>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
