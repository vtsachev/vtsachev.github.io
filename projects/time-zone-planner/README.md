# Time Zone Planner

A React app for planning meetings across 2-5 timezones with a 24-hour horizontal grid.

This project is organized as:

- `app/`: source code and build tooling
- `index.html` + `assets/` at the project root: deployed static output for GitHub Pages

## Features

- Add timezones by city, IANA name, country, or UTC/GMT offset search.
- **Browse every country and capital by region** (Africa, Americas, Asia, Europe,
  Oceania) with country flags and "Capital / City / Zone / Offset" badges.
- **"Use my timezone"** one-click add of the visitor's detected local zone.
- Search results include each option's current UTC offset for quick comparison.
- Four-tier hour quality bands per row:
  - core: 9a-5p
  - flex: 7-9a, 5-7p
  - edge: 6-7a, 7-10p
  - off-hours: everything else
- Best-overlap markers and grouped meeting-window summary.
- **Shareable links**: the current zones + selected day are encoded in the URL, so a
  plan can be copied and sent (`🔗 Copy shareable link`), and opened deep-links hydrate.
- **Export a window**: copy a plaintext summary or open it as a Google Calendar event.
- Click any UTC hour column to compare local times in all selected zones.
- Day-of-week markers in each row make cross-date overlaps visible (e.g., Sun vs Mon).
- 14-day date strip anchored to the top timezone to preview future-day overlap windows.
- Reorder rows by drag-and-drop **or keyboard-accessible ↑ / ↓ buttons**.
- Current-time marker; visible keyboard focus styles; hour ruler retained on mobile.
- Internet-synced clock (TimeAPI.io + WorldTimeAPI fallback) with local fallback.
- DST and half/quarter-hour offset support via `Intl.DateTimeFormat`.

## Data Management

Timezone options are maintained separately in CSV files:

- `app/src/data/timezones.csv`
- `app/src/data/country-capitals.csv`

`country-capitals.csv` covers all ~250 countries/territories and carries two extra
columns used for browsing:

- `code`: ISO 3166-1 alpha-2 (drives the flag emoji)
- `region`: Africa / Americas / Asia / Europe / Oceania / Antarctica (drives region chips)

At load time, the app merges:

- curated CSV entries
- country-capital CSV entries (with flag + region)
- all browser-supported IANA timezone identifiers
- generated UTC/GMT offset aliases with quarter-hour granularity (e.g. `UTC+5:30`, `GMT-3:45`)

CSV data is validated for:

- duplicate `city + tz` pairs
- invalid IANA timezone strings
- missing required fields (`city`, `tz`, `country`)

To (re)add the `code` + `region` columns to the existing, hand-vetted CSV without
regenerating city/timezone values (and applying known timezone corrections such as
American Samoa → `Pacific/Pago_Pago`):

```bash
npm run enrich:country-capitals
```

> Note: `generate:country-capitals` rebuilds the CSV from scratch via restcountries +
> `tz-lookup`, but that API's v3.1 has been deprecated; prefer `enrich` for maintenance.

## Project Structure

- `src/App.jsx`: page composition, state management, and URL hydration
- `src/components/*`: UI components (rows, cells, search, summaries)
- `src/lib/timezone.js`: timezone conversion/format helpers
- `src/lib/overlap.js`: category and overlap scoring logic
- `src/lib/geo.js`: flag emoji, region derivation, and source-badge labels
- `src/lib/urlState.js`: encode/decode the shareable plan (zones + day) in the URL
- `src/lib/share.js`: clipboard copy + Google Calendar export helpers
- `src/data/timezones.csv`: curated timezone dataset
- `src/data/country-capitals.csv`: country-capital dataset (`city,tz,country,code,region`)

All paths above are relative to `app/`.

## Run

```bash
cd app
npm install
npm run dev
```

## Validate

```bash
cd app
npm run validate:timezones
npm run generate:country-capitals
npm run lint
npm run build
```

`npm run build` writes deploy-ready files to this project root (`../`) so the app is hosted at `/projects/time-zone-planner/`.
