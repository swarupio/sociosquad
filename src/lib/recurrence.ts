/**
 * Pure recurrence helpers. Dates are YYYY-MM-DD strings and all math uses UTC so
 * results never drift with the viewer's timezone or DST. Mirrors the SQL in
 * create_opportunity_series (weekly +7d, biweekly +14d, monthly +i months from
 * the start date, clamped to month end).
 */

export type RecurrenceRule = "weekly" | "biweekly" | "monthly";

export const MIN_OCCURRENCES = 2;
export const MAX_OCCURRENCES = 52;

export const RECURRENCE_LABELS: Record<RecurrenceRule, string> = {
  weekly: "Weekly",
  biweekly: "Every 2 weeks",
  monthly: "Monthly",
};

export interface GenerateOptions {
  rule: RecurrenceRule;
  startsOn: string;
  occurrences: number;
  /** Reserved (series table column); the server currently ignores it. */
  weekdays?: number[];
}

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseYmd(s: string): { y: number; m: number; d: number } | null {
  const match = DATE_RE.exec(s);
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return { y, m, d };
}

function fmt(y: number, m: number, d: number): string {
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.toISOString().slice(0, 10);
}

export function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function addDays(s: string, days: number): string {
  const p = parseYmd(s);
  if (!p) throw new Error(`Invalid date: ${s}`);
  return fmt(p.y, p.m, p.d + days);
}

export function addMonthsClamped(s: string, months: number): string {
  const p = parseYmd(s);
  if (!p) throw new Error(`Invalid date: ${s}`);
  const total = p.y * 12 + (p.m - 1) + months;
  const y = Math.floor(total / 12);
  const m = (total % 12) + 1;
  return fmt(y, m, Math.min(p.d, daysInMonth(y, m)));
}

export function generateOccurrenceDates({ rule, startsOn, occurrences }: GenerateOptions): string[] {
  const err = validateRecurrence({ rule, startsOn, occurrences });
  if (err) return [];
  const out: string[] = [];
  for (let i = 0; i < occurrences; i++) {
    if (rule === "weekly") out.push(addDays(startsOn, i * 7));
    else if (rule === "biweekly") out.push(addDays(startsOn, i * 14));
    else out.push(addMonthsClamped(startsOn, i));
  }
  return out;
}

/** Returns an error message, or null when valid. */
export function validateRecurrence(input: {
  rule: string;
  startsOn: string;
  occurrences: number;
}): string | null {
  if (input.rule !== "weekly" && input.rule !== "biweekly" && input.rule !== "monthly") {
    return "Choose how often this repeats.";
  }
  if (!parseYmd(input.startsOn)) return "Pick a valid start date.";
  if (!Number.isInteger(input.occurrences)) return "Occurrences must be a whole number.";
  if (input.occurrences < MIN_OCCURRENCES || input.occurrences > MAX_OCCURRENCES) {
    return `Occurrences must be between ${MIN_OCCURRENCES} and ${MAX_OCCURRENCES}.`;
  }
  return null;
}

export function describeRecurrence(rule: RecurrenceRule, startsOn: string, occurrences: number): string {
  const p = parseYmd(startsOn);
  const base =
    rule === "weekly" ? "Repeats weekly" : rule === "biweekly" ? "Repeats every 2 weeks" : "Repeats monthly";
  if (!p || !Number.isInteger(occurrences) || occurrences < 1) return base;
  const dates = generateOccurrenceDates({ rule, startsOn, occurrences });
  const last = dates[dates.length - 1] ?? startsOn;
  const weekday = new Date(Date.UTC(p.y, p.m - 1, p.d)).toLocaleDateString("en-IN", {
    weekday: "long",
    timeZone: "UTC",
  });
  const on = rule === "monthly" ? `on day ${p.d}` : `on ${weekday}s`;
  return `${base} ${on}, ${occurrences} times, until ${formatYmd(last)}`;
}

export function formatYmd(s: string): string {
  const p = parseYmd(s);
  if (!p) return s;
  return new Date(Date.UTC(p.y, p.m - 1, p.d)).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}
export const DEFAULT_RECURRENCE: { rule: RecurrenceRule | "none"; occurrences: number } = { rule: "none", occurrences: 4 };
