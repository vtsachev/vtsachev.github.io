import { getDateAtUtcHour, getLocalMinutesOfDay } from "./timezone";

export const CATEGORY_META = {
  core: { label: "Core (9a-5p)", color: "#22c55e", text: "#f8fafc" },
  flex: { label: "Flex (7-9a, 5-7p)", color: "#eab308", text: "#0f172a" },
  edge: { label: "Edge (6-7a, 7-10p)", color: "#8b5cf6", text: "#f8fafc" },
  off: { label: "Off-hours", color: "#1e293b", text: "#94a3b8" },
};

const CATEGORY_WEIGHT = {
  core: 3,
  flex: 1.5,
  edge: 0.5,
  off: 0,
};

export function getHourCategory(localMinutesOfDay) {
  if (localMinutesOfDay >= 9 * 60 && localMinutesOfDay < 17 * 60) {
    return "core";
  }

  if (
    (localMinutesOfDay >= 7 * 60 && localMinutesOfDay < 9 * 60) ||
    (localMinutesOfDay >= 17 * 60 && localMinutesOfDay < 19 * 60)
  ) {
    return "flex";
  }

  if (
    (localMinutesOfDay >= 6 * 60 && localMinutesOfDay < 7 * 60) ||
    (localMinutesOfDay >= 19 * 60 && localMinutesOfDay < 22 * 60)
  ) {
    return "edge";
  }

  return "off";
}

export function computeOverlap(zones, utcDayStart) {
  const slotScores = Array.from({ length: 24 }, (_, utcHour) => {
    const date = getDateAtUtcHour(utcDayStart, utcHour);
    const categories = zones.map((zone) => {
      const localMinutes = getLocalMinutesOfDay(zone.tz, date);
      return getHourCategory(localMinutes);
    });

    const score = categories.reduce(
      (total, category) => total + CATEGORY_WEIGHT[category],
      0,
    );
    const allCore = categories.every((category) => category === "core");

    return {
      utcHour,
      date,
      categories,
      score,
      allCore,
    };
  });

  const allCoreHours = slotScores
    .filter((slot) => slot.allCore)
    .map((slot) => slot.utcHour);

  if (allCoreHours.length > 0) {
    return {
      slotScores,
      bestUtcHours: allCoreHours,
      mode: "all-core",
      maxScore: Math.max(...slotScores.map((slot) => slot.score)),
    };
  }

  const maxScore = Math.max(...slotScores.map((slot) => slot.score));
  const bestUtcHours = slotScores
    .filter((slot) => slot.score === maxScore)
    .map((slot) => slot.utcHour);

  return {
    slotScores,
    bestUtcHours,
    mode: "best-available",
    maxScore,
  };
}

export function groupConsecutiveHours(hours) {
  if (hours.length === 0) {
    return [];
  }

  const sorted = [...new Set(hours)].sort((a, b) => a - b);
  const groups = [];
  let current = { start: sorted[0], end: sorted[0] };

  for (let i = 1; i < sorted.length; i += 1) {
    const hour = sorted[i];

    if (hour === current.end + 1) {
      current.end = hour;
      continue;
    }

    groups.push(current);
    current = { start: hour, end: hour };
  }

  groups.push(current);

  if (groups.length > 1) {
    const first = groups[0];
    const last = groups.at(-1);
    if (first.start === 0 && last.end === 23) {
      groups[0] = { start: last.start, end: first.end + 24 };
      groups.pop();
    }
  }

  return groups;
}
