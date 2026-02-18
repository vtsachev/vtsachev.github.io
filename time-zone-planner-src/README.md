# Time Zone Planner

A React app for planning meetings across 2-5 timezones with a 24-hour horizontal grid.

## Features

- Add timezones by city, IANA name, country, or UTC/GMT offset search.
- Four-tier hour quality bands per row:
  - core: 9a-5p
  - flex: 7-9a, 5-7p
  - edge: 6-7a, 7-10p
  - off-hours: everything else
- Best-overlap markers and grouped meeting-window summary.
- Click any UTC hour column to compare local times in all selected zones.
- Drag-and-drop row reordering.
- Current-time marker.
- Internet-synced clock (WorldTimeAPI) with local fallback.
- DST and half/quarter-hour offset support via `Intl.DateTimeFormat`.

## Data Management

Timezone options are maintained separately in CSV files:

- `src/data/timezones.csv`
- `src/data/country-capitals.csv`

At load time, the app merges:

- curated CSV entries
- country-capital CSV entries
- all browser-supported IANA timezone identifiers
- generated UTC/GMT offset aliases (e.g. `UTC+5`, `GMT-3`)

CSV data is validated for:

- duplicate `city + tz` pairs
- invalid IANA timezone strings
- missing required fields (`city`, `tz`, `country`)

## Project Structure

- `src/App.jsx`: page composition and state management
- `src/components/*`: UI components (rows, cells, search, summaries)
- `src/lib/timezone.js`: timezone conversion/format helpers
- `src/lib/overlap.js`: category and overlap scoring logic
- `src/data/timezones.csv`: timezone dataset
- `src/data/country-capitals.csv`: country-capital timezone dataset

## Run

```bash
npm install
npm run dev
```

## Validate

```bash
npm run validate:timezones
npm run generate:country-capitals
npm run lint
npm run build
```
