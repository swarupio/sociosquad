export const TITLE_MIN = 3;
export const TITLE_MAX = 120;
export const BODY_MAX = 2000;

export interface AnnouncementInput {
  title: string;
  body: string;
}

export interface AnnouncementErrors {
  title?: string;
  body?: string;
}

/** Strip control chars (keeping newlines/tabs), normalise line endings, trim. */
export function sanitizeText(input: string): string {
  return (input ?? "")
    .replace(/\r\n?/g, "\n")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

export function validateAnnouncement(input: AnnouncementInput): {
  valid: boolean;
  errors: AnnouncementErrors;
  value: AnnouncementInput;
} {
  const title = sanitizeText(input.title).replace(/\s*\n\s*/g, " ");
  const body = sanitizeText(input.body);
  const errors: AnnouncementErrors = {};
  if (title.length < TITLE_MIN) errors.title = `Title must be at least ${TITLE_MIN} characters`;
  else if (title.length > TITLE_MAX) errors.title = `Title must be at most ${TITLE_MAX} characters`;
  if (body.length < 1) errors.body = "Message is required";
  else if (body.length > BODY_MAX) errors.body = `Message must be at most ${BODY_MAX} characters`;
  return { valid: Object.keys(errors).length === 0, errors, value: { title, body } };
}

export function truncate(text: string, max: number): string {
  if (max <= 0) return "";
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

/** Pinned first, then newest first. Does not mutate the input. */
export function groupPinnedFirst<T extends { pinned: boolean; created_at: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

export function relativeTime(iso: string, now: Date = new Date()): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const sec = Math.round((now.getTime() - t) / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  const mon = Math.floor(day / 30);
  if (mon < 12) return `${mon}mo ago`;
  return `${Math.floor(day / 365)}y ago`;
}
