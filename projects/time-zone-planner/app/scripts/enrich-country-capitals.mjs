// One-time enrichment: adds `code` (ISO 3166-1 alpha-2) and `region` columns to
// the existing, hand-vetted country-capitals.csv WITHOUT regenerating city/tz.
// Source: ISO 3166 dataset (stable). Also applies known tz corrections.
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV_PATH = path.resolve(__dirname, "../src/data/country-capitals.csv");
const ISO_URL =
  "https://raw.githubusercontent.com/lukes/ISO-3166-Countries-with-Regional-Codes/master/all/all.csv";

// Corrections for auto-generated tz errors (tz-lookup on bad capital coords).
const TZ_FIX = {
  "American Samoa": "Pacific/Pago_Pago", // was Pacific/Apia (UTC+13); Pago Pago is UTC-11
};

// CSV country name -> ISO dataset name (only where they differ).
const NAME_ALIAS = {
  Bolivia: "Bolivia (Plurinational State of)",
  "British Virgin Islands": "Virgin Islands (British)",
  Brunei: "Brunei Darussalam",
  "Cape Verde": "Cabo Verde",
  "Caribbean Netherlands": "Bonaire, Sint Eustatius and Saba",
  "Cocos (Keeling) Islands": "Cocos (Keeling) Islands",
  "DR Congo": "Congo, Democratic Republic of the",
  "Republic of the Congo": "Congo",
  Congo: "Congo",
  "Ivory Coast": "Côte d'Ivoire",
  Curaçao: "Curaçao",
  "Czechia": "Czechia",
  "Czech Republic": "Czechia",
  "East Timor": "Timor-Leste",
  "French Southern and Antarctic Lands": "French Southern Territories",
  Macau: "Macao",
  Netherlands: "Netherlands, Kingdom of the",
  "Pitcairn Islands": "Pitcairn",
  "United States Virgin Islands": "Virgin Islands (U.S.)",
  "Falkland Islands": "Falkland Islands (Malvinas)",
  "Vatican City": "Holy See",
  Iran: "Iran (Islamic Republic of)",
  Kosovo: "Serbia", // no ISO code; group with region Europe
  Laos: "Lao People's Democratic Republic",
  Micronesia: "Micronesia (Federated States of)",
  Moldova: "Moldova, Republic of",
  Myanmar: "Myanmar",
  "North Korea": "Korea (Democratic People's Republic of)",
  "South Korea": "Korea, Republic of",
  Palestine: "Palestine, State of",
  Russia: "Russian Federation",
  "Saint Barthélemy": "Saint Barthélemy",
  "Saint Helena, Ascension and Tristan da Cunha":
    "Saint Helena, Ascension and Tristan da Cunha",
  "Saint Martin": "Saint Martin (French part)",
  "Sint Maarten": "Sint Maarten (Dutch part)",
  "South Georgia": "South Georgia and the South Sandwich Islands",
  Syria: "Syrian Arab Republic",
  Taiwan: "Taiwan, Province of China",
  Tanzania: "Tanzania, United Republic of",
  "Turkey": "Türkiye",
  "Türkiye": "Türkiye",
  "U.S. Virgin Islands": "Virgin Islands (U.S.)",
  "United Kingdom": "United Kingdom of Great Britain and Northern Ireland",
  "United States": "United States of America",
  "United States Minor Outlying Islands":
    "United States Minor Outlying Islands",
  Venezuela: "Venezuela (Bolivarian Republic of)",
  Vietnam: "Viet Nam",
};

function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i += 1) {
    const c = line[i];
    if (c === '"') {
      if (q && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else q = !q;
    } else if (c === "," && !q) {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out;
}

function csvEscape(v) {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const norm = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "");

// Fetch ISO reference
const isoText = await (await fetch(ISO_URL)).text();
const isoLines = isoText.split(/\r?\n/).filter((l) => l.trim());
const isoHeader = parseCsvLine(isoLines[0]);
const iName = isoHeader.indexOf("name");
const iAlpha2 = isoHeader.indexOf("alpha-2");
const iRegion = isoHeader.indexOf("region");
const isoByName = new Map();
for (const line of isoLines.slice(1)) {
  const cols = parseCsvLine(line);
  isoByName.set(norm(cols[iName]), {
    code: cols[iAlpha2],
    region: cols[iRegion] || "",
  });
}

// tz prefix -> region fallback (for territories missing an ISO region)
function regionFromTz(tz) {
  const p = String(tz).split("/")[0];
  if (p === "Africa") return "Africa";
  if (p === "America") return "Americas";
  if (p === "Asia") return "Asia";
  if (p === "Europe") return "Europe";
  if (p === "Australia" || p === "Pacific") return "Oceania";
  if (p === "Antarctica") return "Antarctica";
  return "Other";
}

// Read existing CSV
const csvText = await readFile(CSV_PATH, "utf8");
const lines = csvText.split(/\r?\n/).filter((l) => l.trim());
const rows = lines.slice(1).map((l) => {
  const [city, tz, country] = parseCsvLine(l);
  return { city, tz, country };
});

const unmatched = [];
const out = rows.map((r) => {
  const tz = TZ_FIX[r.country] || r.tz;
  const isoName = NAME_ALIAS[r.country] || r.country;
  const iso = isoByName.get(norm(isoName)) || isoByName.get(norm(r.country));
  if (!iso) unmatched.push(r.country);
  const region = iso?.region || regionFromTz(tz);
  return { city: r.city, tz, country: r.country, code: iso?.code || "", region };
});

const header = "city,tz,country,code,region";
const body = out
  .map(
    (r) =>
      `${csvEscape(r.city)},${csvEscape(r.tz)},${csvEscape(r.country)},${csvEscape(
        r.code,
      )},${csvEscape(r.region)}`,
  )
  .join("\n");
await writeFile(CSV_PATH, `${header}\n${body}\n`, "utf8");

console.log(`Enriched ${out.length} rows -> ${CSV_PATH}`);
console.log(`With code: ${out.filter((r) => r.code).length}`);
console.log(`With region: ${out.filter((r) => r.region).length}`);
if (unmatched.length) {
  console.log(`\nUNMATCHED (no ISO code, region via tz fallback):`);
  console.log(unmatched.join(", "));
}
const byRegion = {};
for (const r of out) byRegion[r.region] = (byRegion[r.region] || 0) + 1;
console.log(`\nRegion counts:`, JSON.stringify(byRegion));
