import { useCallback, useEffect, useMemo, useState } from "react";

const WORLD_TIME_URL = "https://worldtimeapi.org/api/timezone/Etc/UTC";

function getCurrentClientSnapshot() {
  const nowMs = Date.now();
  return {
    baseTimeMs: nowMs,
    baseCapturedAtMs: nowMs,
    source: "Local clock",
    lastSyncedAtMs: null,
    hasInternetSync: false,
  };
}

export function useInternetClock() {
  const [tick, setTick] = useState(0);
  const [clockState, setClockState] = useState(getCurrentClientSnapshot);

  const syncClock = useCallback(async () => {
    try {
      const response = await fetch(WORLD_TIME_URL, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Clock sync failed (${response.status})`);
      }

      const payload = await response.json();
      const serverMs = Number.isFinite(payload.unixtime)
        ? payload.unixtime * 1000
        : Date.parse(payload.utc_datetime || payload.datetime || "");

      if (!Number.isFinite(serverMs)) {
        throw new Error("Clock sync returned invalid timestamp.");
      }

      setClockState({
        baseTimeMs: serverMs,
        baseCapturedAtMs: Date.now(),
        source: "WorldTimeAPI",
        lastSyncedAtMs: Date.now(),
        hasInternetSync: true,
      });
    } catch {
      setClockState((previous) => {
        if (previous.hasInternetSync) {
          return previous;
        }

        return {
          ...getCurrentClientSnapshot(),
          source: "Local clock fallback",
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
    syncClock,
  };
}
