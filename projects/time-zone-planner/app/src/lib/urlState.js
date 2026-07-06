// Encode/decode the planner's shareable state (zones + selected day) in the URL
// query string, so a planned meeting can be sent as a link.

const ZONES_PARAM = "z";
const DAY_PARAM = "d";
const PAIR_SEP = ";";
const FIELD_SEP = "~";

export function encodeZonesToQuery(zones, dayOffset) {
  const params = new URLSearchParams();
  const packed = zones
    .map((zone) => `${zone.tz}${FIELD_SEP}${zone.city}`)
    .join(PAIR_SEP);

  if (packed) {
    params.set(ZONES_PARAM, packed);
  }
  if (Number(dayOffset) > 0) {
    params.set(DAY_PARAM, String(dayOffset));
  }

  return params.toString();
}

export function parseZonesFromQuery(search = window.location.search) {
  const params = new URLSearchParams(search);
  const raw = params.get(ZONES_PARAM);
  const dayOffset = Number.parseInt(params.get(DAY_PARAM) || "0", 10) || 0;

  if (!raw) {
    return { zones: [], dayOffset };
  }

  const zones = raw
    .split(PAIR_SEP)
    .map((pair) => {
      const sepIndex = pair.indexOf(FIELD_SEP);
      if (sepIndex === -1) {
        return null;
      }
      const tz = pair.slice(0, sepIndex).trim();
      const city = pair.slice(sepIndex + 1).trim();
      if (!tz || !city) {
        return null;
      }
      return { tz, city };
    })
    .filter(Boolean);

  return { zones, dayOffset };
}

// Replace (not push) the URL so back-button history stays clean.
export function syncUrl(zones, dayOffset) {
  if (typeof window === "undefined" || !window.history?.replaceState) {
    return;
  }
  const query = encodeZonesToQuery(zones, dayOffset);
  const url = `${window.location.pathname}${query ? `?${query}` : ""}`;
  window.history.replaceState(null, "", url);
}

export function getShareUrl() {
  if (typeof window === "undefined") {
    return "";
  }
  return window.location.href;
}
