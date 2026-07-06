// Clipboard + calendar export helpers for turning a chosen window into something
// a user can actually save or send.

export async function copyText(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to legacy path
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

// UTC timestamp (ms) -> "YYYYMMDDTHHMMSSZ" for calendar links.
function toCalendarStamp(ms) {
  const d = new Date(ms);
  const pad = (n) => String(n).padStart(2, "0");
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

export function buildGoogleCalendarUrl({ title, startMs, endMs, details }) {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${toCalendarStamp(startMs)}/${toCalendarStamp(endMs)}`,
  });
  if (details) {
    params.set("details", details);
  }
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
