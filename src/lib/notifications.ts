export type NotificationType =
  | "reminder"
  | "registration"
  | "verification"
  | "announcement"
  | "badge"
  | "waitlist"
  | "system";

export interface AppNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

export const NOTIFICATION_COLUMNS = "id, user_id, type, title, body, link, read_at, created_at";

export function unreadCount(items: Pick<AppNotification, "read_at">[]): number {
  return items.reduce((n, i) => (i.read_at ? n : n + 1), 0);
}

const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export interface DayGroup<T> {
  key: string;
  label: "Today" | "Yesterday" | string;
  items: T[];
}

/** Group items (newest first order preserved) by local calendar day. */
export function groupByDay<T extends { created_at: string }>(items: T[], now: Date = new Date()): DayGroup<T>[] {
  const today = dayKey(now);
  const y = new Date(now);
  y.setDate(y.getDate() - 1);
  const yesterday = dayKey(y);
  const groups = new Map<string, DayGroup<T>>();
  for (const item of items) {
    const d = new Date(item.created_at);
    if (Number.isNaN(d.getTime())) continue;
    const key = dayKey(d);
    let g = groups.get(key);
    if (!g) {
      const label =
        key === today
          ? "Today"
          : key === yesterday
            ? "Yesterday"
            : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
      g = { key, label, items: [] };
      groups.set(key, g);
    }
    g.items.push(item);
  }
  return [...groups.values()];
}

export function relativeTime(iso: string, now: Date = new Date()): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const s = Math.round((now.getTime() - t) / 1000);
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d ago`;
  const w = Math.round(d / 7);
  if (d < 30) return `${w}w ago`;
  return new Date(t).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export interface ReminderEvent {
  id: string;
  title: string;
  /** YYYY-MM-DD */
  date: string;
  /** HH:MM or HH:MM:SS; defaults to 09:00 */
  start_time?: string | null;
}

export interface ScheduledReminder {
  key: string;
  eventId: string;
  title: string;
  at: number;
  offsetMinutes: number;
  startsAt: number;
}

export const MAX_REMINDER_HORIZON_MS = 48 * 60 * 60 * 1000;

export function eventStartMs(e: Pick<ReminderEvent, "date" | "start_time">): number {
  const time = /^\d{2}:\d{2}/.test(e.start_time ?? "") ? (e.start_time as string).slice(0, 5) : "09:00";
  return new Date(`${e.date}T${time}:00`).getTime();
}

export function reminderKey(eventId: string, offsetMinutes: number, startsAt: number): string {
  return `ss:reminder:${eventId}:${offsetMinutes}:${startsAt}`;
}

/** Upcoming reminder fire times within the horizon, sorted ascending. */
export function reminderSchedule(
  events: ReminderEvent[],
  now: Date = new Date(),
  offsetsMinutes: number[] = [1440, 60],
  horizonMs: number = MAX_REMINDER_HORIZON_MS,
): ScheduledReminder[] {
  const nowMs = now.getTime();
  const out: ScheduledReminder[] = [];
  for (const e of events) {
    const startsAt = eventStartMs(e);
    if (Number.isNaN(startsAt) || startsAt <= nowMs) continue;
    for (const off of offsetsMinutes) {
      const at = startsAt - off * 60_000;
      if (at <= nowMs || at - nowMs > horizonMs) continue;
      out.push({ key: reminderKey(e.id, off, startsAt), eventId: e.id, title: e.title, at, offsetMinutes: off, startsAt });
    }
  }
  return out.sort((a, b) => a.at - b.at);
}

export interface KeyStore {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
}

function defaultStore(): KeyStore | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

export function hasFired(key: string, store: KeyStore | null = defaultStore()): boolean {
  try {
    return store?.getItem(key) === "1";
  } catch {
    return false;
  }
}

export function markFired(key: string, store: KeyStore | null = defaultStore()): void {
  try {
    store?.setItem(key, "1");
  } catch {
    /* storage unavailable or full: ignore */
  }
}

export function reminderBody(offsetMinutes: number): string {
  if (offsetMinutes >= 1440) return "Starts tomorrow. Get ready to make a difference!";
  if (offsetMinutes >= 60) return `Starts in ${Math.round(offsetMinutes / 60)} hour(s).`;
  return `Starts in ${offsetMinutes} minutes.`;
}
