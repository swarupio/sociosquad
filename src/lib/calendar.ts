export interface CalendarEventInput {
  id: string;
  title: string;
  /** ISO date, YYYY-MM-DD */
  date: string;
  /** HH:MM or HH:MM:SS (local time). Defaults to 09:00. */
  startTime?: string | null;
  /** HH:MM or HH:MM:SS (local time). Defaults to start + 2h. */
  endTime?: string | null;
  location?: string;
  description?: string;
  organizer?: string;
  url?: string;
}

/** Escape text per RFC 5545 section 3.3.11. */
export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** Fold lines longer than 75 octets (RFC 5545 section 3.1). */
export function foldIcsLine(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [line.slice(0, 75)];
  for (let i = 75; i < line.length; i += 74) parts.push(` ${line.slice(i, i + 74)}`);
  return parts.join("\r\n");
}

const pad = (n: number) => String(n).padStart(2, "0");

function parseTime(value: string | null | undefined, fallbackMinutes: number): number {
  const match = /^(\d{1,2}):(\d{2})/.exec(value ?? "");
  if (!match) return fallbackMinutes;
  const minutes = Number(match[1]) * 60 + Number(match[2]);
  return minutes >= 0 && minutes < 24 * 60 ? minutes : fallbackMinutes;
}

/** Floating local time: YYYYMMDDTHHMMSS (no Z), so it renders at the stated wall-clock time. */
function toIcsLocal(date: string, minutes: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(y, m - 1, d, 0, minutes, 0);
  return `${dt.getFullYear()}${pad(dt.getMonth() + 1)}${pad(dt.getDate())}T${pad(dt.getHours())}${pad(dt.getMinutes())}00`;
}

function toIcsUtcStamp(now: Date): string {
  return `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;
}

export function buildIcs(event: CalendarEventInput, now: Date = new Date()): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(event.date)) throw new Error("A valid event date is required");

  const start = parseTime(event.startTime, 9 * 60);
  let end = parseTime(event.endTime, start + 120);
  if (end <= start) end = start + 120;

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SocioSquad//Volunteer Opportunities//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.id}@sociosquad`,
    `DTSTAMP:${toIcsUtcStamp(now)}`,
    `DTSTART:${toIcsLocal(event.date, start)}`,
    `DTEND:${toIcsLocal(event.date, end)}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
  ];
  if (event.location) lines.push(`LOCATION:${escapeIcsText(event.location)}`);
  const description = [event.organizer ? `Organised by ${event.organizer}` : "", event.description ?? ""]
    .filter(Boolean)
    .join("\n\n");
  if (description) lines.push(`DESCRIPTION:${escapeIcsText(description)}`);
  if (event.url) lines.push(`URL:${event.url}`);
  lines.push(
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "DESCRIPTION:Volunteering starts in 1 hour",
    "TRIGGER:-PT1H",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR"
  );
  return `${lines.map(foldIcsLine).join("\r\n")}\r\n`;
}

/** Trigger a browser download of an .ics file for the event. */
export function downloadIcs(event: CalendarEventInput): void {
  const blob = new Blob([buildIcs(event)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${event.title.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "event"}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
