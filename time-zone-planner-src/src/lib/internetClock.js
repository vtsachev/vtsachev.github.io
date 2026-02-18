import { useCallback, useEffect, useMemo, useState } from "react";

const CLOCK_SOURCES = [
  {
    name: "TimeAPI.io",
    url: "https://timeapi.io/api/Time/current/zone?timeZone=UTC",
    parseTimestamp(payload) {
      return Date.parse(payload?.dateTime || "");
    },
  },
  {
    name: "WorldTimeAPI",
    url: "https://worldtimeapi.org/api/timezone/Etc/UTC",
    parseTimestamp(payload) {
      if (Number.isFinite(payload?.unixtime)) {
        return payload.unixtime * 1000;
      }
      return Date.parse(payload?.utc_datetime || payload?.datetime || "");
    },
  },
];

const REQUEST_TIMEOUT_MS = 4000;

function getCurrentClientSnapshot(source = "Local clock") {
  const nowMs = Date.now();
  return {
    baseTimeMs: nowMs,
    baseCapturedAtMs: nowMs,
    source,
    lastSyncedAtMs: null,
    hasInternetSync: false,
    lastError: null,
  };
}

async function fetchJsonWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchUtcTimeFromProviders() {
  const errors = [];

  for (const provider of CLOCK_SOURCES) {
    try {
      const payload = await fetchJsonWithTimeout(provider.url, REQUEST_TIMEOUT_MS);
      const timestampMs = provider.parseTimestamp(payload);

      if (!Number.isFinite(timestampMs)) {
        throw new Error("Provider returned invalid timestamp");
      }

      return {
        source: provider.name,
        timestampMs,
      };
    } catch (error) {
      errors.push(`${provider.name}: ${error.message}`);
    }
  }

  throw new Error(errors.join(" | "));
}

export function useInternetClock() {
  const [tick, setTick] = useState(0);
  const [clockState, setClockState] = useState(getCurrentClientSnapshot);

  const syncClock = useCallback(async () => {
    try {
      const { source, timestampMs } = await fetchUtcTimeFromProviders();

      setClockState({
        baseTimeMs: timestampMs,
        baseCapturedAtMs: Date.now(),
        source,
        lastSyncedAtMs: Date.now(),
        hasInternetSync: true,
        lastError: null,
      });
    } catch (error) {
      setClockState((previous) => {
        if (previous.hasInternetSync) {
          const staleSource = previous.source.endsWith(" (stale)")
            ? previous.source
            : `${previous.source} (stale)`;

          return {
            ...previous,
            source: staleSource,
            lastError: error.message,
          };
        }

        return {
          ...getCurrentClientSnapshot("Local clock fallback"),
          lastError: error.message,
        };
      });
    }
  }, []);

  useEffect(() => {
    syncClock();

    const tickTimer = setInterval(() => setTick((value) => value + 1), 15_000);
    const syncTimer = setInterval(syncClock, 10 * 60_000);

    return () => {
      clearInterval(tickTimer);
      clearInterval(syncTimer);
    };
  }, [syncClock]);

  const now = useMemo(() => {
    // This memo recalculates on the interval tick to keep time moving.
    void tick;
    const elapsed = Date.now() - clockState.baseCapturedAtMs;
    return new Date(clockState.baseTimeMs + elapsed);
  }, [clockState, tick]);

  return {
    now,
    source: clockState.source,
    hasInternetSync: clockState.hasInternetSync,
    lastSyncedAtMs: clockState.lastSyncedAtMs,
    lastError: clockState.lastError,
    syncClock,
  };
}
