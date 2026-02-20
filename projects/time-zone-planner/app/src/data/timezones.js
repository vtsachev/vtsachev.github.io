import countryCapitalsCsv from "./country-capitals.csv?raw";
import curatedTimezoneCsv from "./timezones.csv?raw";
import {
  getTimezoneEntryKey,
  parseAndValidateTimezoneCsv,
} from "./timezoneCatalog";

const { rows: curatedRows } = parseAndValidateTimezoneCsv(curatedTimezoneCsv);
const { rows: capitalRows } = parseAndValidateTimezoneCsv(countryCapitalsCsv);

function formatOffsetLabel(prefix, offsetMinutes) {
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absMinutes = Math.abs(offsetMinutes);
  const hours = Math.floor(absMinutes / 60);
  const minutes = absMinutes % 60;

  if (minutes === 0) {
    return `${prefix}${sign}${hours}`;
  }

  return `${prefix}${sign}${hours}:${String(minutes).padStart(2, "0")}`;
}

function buildOffsetRows() {
  const offsets = new Set();
  const quarterHourIncrements = [0, 15, 30, 45];

  for (let hour = -12; hour <= 14; hour += 1) {
    for (const minutes of quarterHourIncrements) {
      if (hour === 14 && minutes > 0) {
        continue;
      }
      if (hour === -12 && minutes > 0) {
        continue;
      }

      const sign = hour >= 0 ? 1 : -1;
      offsets.add(hour * 60 + sign * minutes);
    }
  }

  const rows = Array.from(offsets)
    .sort((a, b) => a - b)
    .flatMap((offsetMinutes) => {
      const utcLabel = formatOffsetLabel("UTC", offsetMinutes);
      const gmtLabel = formatOffsetLabel("GMT", offsetMinutes);

      return [
        {
          city: utcLabel,
          tz: utcLabel,
          country: "Offset",
          source: "offset",
          rank: 2,
        },
        {
          city: gmtLabel,
          tz: gmtLabel,
          country: "Offset",
          source: "offset",
          rank: 2,
        },
      ];
    });

  rows.push(
    {
      city: "UTC",
      tz: "UTC",
      country: "Offset",
      source: "offset",
      rank: 2,
    },
    {
      city: "GMT",
      tz: "GMT",
      country: "Offset",
      source: "offset",
      rank: 2,
    },
  );

  return rows;
}

function humanizeIanaTimezone(tz) {
  const parts = tz.split("/");
  const city = parts.at(-1) ?? tz;
  return city.replace(/_/g, " ");
}

function buildIanaRows() {
  if (typeof Intl.supportedValuesOf !== "function") {
    return [];
  }

  return Intl.supportedValuesOf("timeZone").map((tz) => ({
    city: humanizeIanaTimezone(tz),
    tz,
    country: "IANA",
    source: "iana",
    rank: 3,
  }));
}

function normalizeSearchValue(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[\s_]+/g, "")
    .trim();
}

function addSearchFields(entry) {
  const searchRaw = `${entry.city} ${entry.country} ${entry.tz}`.toLowerCase();
  return {
    ...entry,
    searchRaw,
    searchCompact: normalizeSearchValue(searchRaw),
  };
}

const mergedMap = new Map();

[
  ...curatedRows.map((entry) => ({
    ...entry,
    source: "curated",
    rank: 0,
    isPopular: true,
  })),
  ...capitalRows.map((entry) => ({
    ...entry,
    source: "capital",
    rank: 1,
    isPopular: false,
  })),
  ...buildOffsetRows(),
  ...buildIanaRows(),
].forEach((entry) => {
  const key = getTimezoneEntryKey(entry);
  if (!mergedMap.has(key)) {
    mergedMap.set(key, addSearchFields(entry));
  }
});

export const TIMEZONE_DATA = Object.freeze(Array.from(mergedMap.values()));
export const TIMEZONE_KEY_SET = new Set(
  TIMEZONE_DATA.map((entry) => getTimezoneEntryKey(entry)),
);

export function isKnownTimezoneEntry(entry) {
  return TIMEZONE_KEY_SET.has(getTimezoneEntryKey(entry));
}

export function normalizeTimezoneSearchQuery(query) {
  return normalizeSearchValue(query);
}
