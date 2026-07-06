// Geography helpers: flag emoji, region derivation, and source labels used to
// make the country/capital catalog browsable and scannable.

// The regions users can browse by (Antarctica's single entry stays search-only).
export const REGION_OPTIONS = [
  "Africa",
  "Americas",
  "Asia",
  "Europe",
  "Oceania",
];

// Human-readable badge per catalog source.
export const SOURCE_LABEL = {
  curated: "City",
  capital: "Capital",
  iana: "Zone",
  offset: "Offset",
};

// A few curated-CSV country codes that aren't ISO 3166-1 alpha-2.
const CODE_FIXUP = { UK: "GB" };

// ISO 3166-1 alpha-2 -> regional-indicator flag emoji (🇳🇬 etc.).
export function flagEmoji(code) {
  const cc = String(code || "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) {
    return "";
  }
  const BASE = 0x1f1e6;
  return String.fromCodePoint(
    BASE + cc.charCodeAt(0) - 65,
    BASE + cc.charCodeAt(1) - 65,
  );
}

// Normalize a 2-letter country field (curated CSV) into an ISO code.
export function normalizeCountryCode(value) {
  const cc = String(value || "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) {
    return "";
  }
  return CODE_FIXUP[cc] || cc;
}

// Continent-ish region from an IANA timezone prefix (fallback when no CSV region).
export function regionFromTz(tz) {
  const prefix = String(tz || "").split("/")[0];
  switch (prefix) {
    case "Africa":
      return "Africa";
    case "America":
      return "Americas";
    case "Asia":
      return "Asia";
    case "Europe":
      return "Europe";
    case "Australia":
    case "Pacific":
      return "Oceania";
    case "Antarctica":
      return "Antarctica";
    default:
      return "";
  }
}
