const partsFormatterCache = new Map();
const displayFormatterCache = new Map();
const ianaValidationCache = new Map();

const FIXED_OFFSET_PATTERN = /^(UTC|GMT)\s*([+-])\s*(\d{1,2})(?::?(\d{2}))?$/i;

function parseFixedOffsetMinutes(tz) {
  const normalized = String(tz || "").trim().toUpperCase();

  if (normalized === "UTC" || normalized === "GMT") {
    return 0;
  }

  const match = normalized.match(FIXED_OFFSET_PATTERN);
  if (!match) {
    return null;
  }

  const [, , sign, rawHours, rawMinutes] = match;
  const hours = Number.parseInt(rawHours, 10);
  const minutes = Number.parseInt(rawMinutes || "0", 10);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }

  if (hours > 14 || minutes > 59) {
    return null;
  }

  const absoluteMinutes = hours * 60 + minutes;
  return sign === "+" ? absoluteMinutes : -absoluteMinutes;
}

function isValidIanaTimezone(tz) {
  const normalized = String(tz || "").trim();

  if (!normalized) {
    return false;
  }

  if (!ianaValidationCache.has(normalized)) {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: normalized });
      ianaValidationCache.set(normalized, true);
    } catch {
      ianaValidationCache.set(normalized, false);
    }
  }

  return ianaValidationCache.get(normalized);
}

export function isValidTimezoneIdentifier(tz) {
  return parseFixedOffsetMinutes(tz) !== null || isValidIanaTimezone(tz);
}

function getPartsFormatter(tz) {
  if (!partsFormatterCache.has(tz)) {
    partsFormatterCache.set(
      tz,
      new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
      }),
    );
  }

  return partsFormatterCache.get(tz);
}

function getDisplayFormatter(tz, key, options) {
  const cacheKey = `${tz}|${key}`;

  if (!displayFormatterCache.has(cacheKey)) {
    displayFormatterCache.set(
      cacheKey,
      new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        ...options,
      }),
    );
  }

  return displayFormatterCache.get(cacheKey);
}

function readPart(parts, type) {
  const value = parts.find((part) => part.type === type)?.value;
  return Number.parseInt(value ?? "0", 10);
}

function getLocalDateParts(tz, date) {
  const fixedOffsetMinutes = parseFixedOffsetMinutes(tz);

  if (fixedOffsetMinutes !== null) {
    const shifted = new Date(date.getTime() + fixedOffsetMinutes * 60_000);
    return {
      year: shifted.getUTCFullYear(),
      month: shifted.getUTCMonth() + 1,
      day: shifted.getUTCDate(),
      hour: shifted.getUTCHours(),
      minute: shifted.getUTCMinutes(),
      second: shifted.getUTCSeconds(),
    };
  }

  const parts = getPartsFormatter(tz).formatToParts(date);

  return {
    year: readPart(parts, "year"),
    month: readPart(parts, "month"),
    day: readPart(parts, "day"),
    hour: readPart(parts, "hour"),
    minute: readPart(parts, "minute"),
    second: readPart(parts, "second"),
  };
}

function toDateKey(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function getLocalDateKey(tz, date) {
  const local = getLocalDateParts(tz, date);
  return toDateKey(local.year, local.month, local.day);
}

function parseDateKey(dateKey) {
  const match = String(dateKey || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }

  const year = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const day = Number.parseInt(match[3], 10);

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  return { year, month, day };
}

export function addDaysToDateKey(dateKey, days) {
  const parsed = parseDateKey(dateKey);
  if (!parsed) {
    return null;
  }

  const shifted = new Date(
    Date.UTC(parsed.year, parsed.month - 1, parsed.day + Number(days || 0)),
  );

  return toDateKey(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth() + 1,
    shifted.getUTCDate(),
  );
}

export function getUtcTimestampForZoneDateStart(tz, dateKey) {
  const parsed = parseDateKey(dateKey);
  if (!parsed) {
    return NaN;
  }

  const targetLocalDateKey = toDateKey(parsed.year, parsed.month, parsed.day);
  const localAsUtcMs = Date.UTC(parsed.year, parsed.month - 1, parsed.day, 0, 0, 0);
  const fixedOffsetMinutes = parseFixedOffsetMinutes(tz);

  if (fixedOffsetMinutes !== null) {
    return localAsUtcMs - fixedOffsetMinutes * 60_000;
  }

  let utcGuess = localAsUtcMs;

  for (let i = 0; i < 5; i += 1) {
    const offsetMinutes = getOffsetMinutes(tz, new Date(utcGuess));
    const nextGuess = localAsUtcMs - offsetMinutes * 60_000;

    if (Math.abs(nextGuess - utcGuess) < 1000) {
      utcGuess = nextGuess;
      break;
    }

    utcGuess = nextGuess;
  }

  // Safety adjustment for zones with uncommon midnight transitions.
  for (let i = 0; i < 6; i += 1) {
    const localDateKey = getLocalDateKey(tz, new Date(utcGuess));
    if (localDateKey === targetLocalDateKey) {
      break;
    }

    const direction = localDateKey < targetLocalDateKey ? 1 : -1;
    utcGuess += direction * 60 * 60 * 1000;
  }

  return utcGuess;
}

function formatWithZone(tz, key, options, date) {
  const fixedOffsetMinutes = parseFixedOffsetMinutes(tz);

  if (fixedOffsetMinutes !== null) {
    const shifted = new Date(date.getTime() + fixedOffsetMinutes * 60_000);
    return getDisplayFormatter("UTC", `fixed:${key}`, options).format(shifted);
  }

  return getDisplayFormatter(tz, key, options).format(date);
}

export function getOffsetMinutes(tz, date) {
  const fixedOffsetMinutes = parseFixedOffsetMinutes(tz);
  if (fixedOffsetMinutes !== null) {
    return fixedOffsetMinutes;
  }

  const local = getLocalDateParts(tz, date);
  const utcTimestampFromLocal = Date.UTC(
    local.year,
    local.month - 1,
    local.day,
    local.hour,
    local.minute,
    local.second,
  );

  return Math.round((utcTimestampFromLocal - date.getTime()) / 60_000);
}

export function getLocalMinutesOfDay(tz, date) {
  const local = getLocalDateParts(tz, date);
  return local.hour * 60 + local.minute;
}

export function normalizeMinutes(minutes) {
  return ((minutes % 1440) + 1440) % 1440;
}

export function formatTimeOfDay(totalMinutes, { alwaysShowMinutes = false } = {}) {
  const normalized = normalizeMinutes(totalMinutes);
  const hour24 = Math.floor(normalized / 60);
  const minute = normalized % 60;
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  const suffix = hour24 < 12 ? "a" : "p";

  if (!alwaysShowMinutes && minute === 0) {
    return `${hour12}${suffix}`;
  }

  return `${hour12}:${String(minute).padStart(2, "0")}${suffix}`;
}

export function formatCurrentTimeInZone(tz, date = new Date()) {
  return formatWithZone(
    tz,
    "current",
    {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    },
    date,
  );
}

export function formatTimeInZoneAtDate(tz, date) {
  return formatWithZone(
    tz,
    "slot",
    {
      weekday: "short",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    },
    date,
  );
}

export function formatDateInZone(
  tz,
  date,
  {
    weekday = "short",
    month = "short",
    day = "numeric",
  } = {},
) {
  return formatWithZone(
    tz,
    `date:${weekday}:${month}:${day}`,
    {
      weekday,
      month,
      day,
    },
    date,
  );
}

export function formatWeekdayInZone(tz, date) {
  return formatWithZone(
    tz,
    "weekday",
    {
      weekday: "short",
    },
    date,
  );
}

export function formatOffsetLabel(tz, date = new Date()) {
  const offsetMinutes = getOffsetMinutes(tz, date);
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMinutes);
  const hours = Math.floor(abs / 60);
  const minutes = abs % 60;

  if (minutes === 0) {
    return `UTC${sign}${hours}`;
  }

  return `UTC${sign}${hours}:${String(minutes).padStart(2, "0")}`;
}

export function getUtcDayStart(date) {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function getDateAtUtcHour(utcDayStart, hour) {
  return new Date(utcDayStart + hour * 60 * 60 * 1000);
}
