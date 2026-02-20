import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import tzLookup from "tz-lookup";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SOURCE_URL =
  "https://restcountries.com/v3.1/all?fields=name,capital,capitalInfo,cca2";

const FALLBACK_TIMEZONE_BY_CODE = {
  AQ: "Antarctica/Troll",
  BV: "UTC",
  HM: "Indian/Kerguelen",
  MO: "Asia/Macau",
  UM: "Pacific/Midway",
};

function isValidIanaTimezone(tz) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

function csvEscape(value) {
  const str = String(value ?? "");
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

const countriesResponse = await fetch(SOURCE_URL, {
  headers: {
    Accept: "application/json",
  },
});

if (!countriesResponse.ok) {
  throw new Error(`Failed to fetch country list (${countriesResponse.status}).`);
}

const countries = await countriesResponse.json();

const rows = countries
  .map((country) => {
    const code = country.cca2;
    const countryName = country?.name?.common?.trim() || "Unknown";
    const city = country?.capital?.[0]?.trim() || countryName;
    const latLng =
      Array.isArray(country?.capitalInfo?.latlng) && country.capitalInfo.latlng.length === 2
        ? country.capitalInfo.latlng
        : null;

    let tz = FALLBACK_TIMEZONE_BY_CODE[code] || "UTC";

    if (!FALLBACK_TIMEZONE_BY_CODE[code] && latLng) {
      const [lat, lng] = latLng;
      try {
        tz = tzLookup(lat, lng);
      } catch {
        tz = "UTC";
      }
    }

    if (!isValidIanaTimezone(tz)) {
      tz = "UTC";
    }

    return {
      city,
      tz,
      country: countryName,
      code,
    };
  })
  .sort((a, b) => {
    const countryCompare = a.country.localeCompare(b.country);
    if (countryCompare !== 0) {
      return countryCompare;
    }
    return a.city.localeCompare(b.city);
  });

const csvOutput = [
  "city,tz,country",
  ...rows.map((row) => `${csvEscape(row.city)},${csvEscape(row.tz)},${csvEscape(row.country)}`),
].join("\n") + "\n";

const outputPath = path.resolve(__dirname, "../src/data/country-capitals.csv");
await writeFile(outputPath, csvOutput, "utf8");

console.log(`Wrote ${rows.length} rows to ${outputPath}`);
