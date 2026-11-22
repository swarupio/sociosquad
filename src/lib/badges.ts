import {
  Award,
  CalendarDays,
  Clock,
  Compass,
  Flame,
  Footprints,
  HeartHandshake,
  Medal,
  Sunrise,
  Trophy,
  type LucideIcon,
} from "lucide-react";

export type BadgeTier = "bronze" | "silver" | "gold";

export type CriteriaType =
  | "events"
  | "hours"
  | "categories"
  | "weekend_events"
  | "early_events"
  | "streak_weeks";

export interface BadgeCriteria {
  type?: CriteriaType | string;
  target?: number;
}

export interface BadgeDefinition {
  code: string;
  name: string;
  description: string;
  icon: string;
  tier: BadgeTier;
  criteria: BadgeCriteria | null;
  sort: number;
}

/** Aggregates of a user's verified volunteering, mirroring evaluate_badges() in SQL. */
export interface BadgeStats {
  events: number;
  hours: number;
  categories: number;
  weekendEvents: number;
  earlyEvents: number;
  streakWeeks: number;
}

export const EMPTY_STATS: BadgeStats = {
  events: 0,
  hours: 0,
  categories: 0,
  weekendEvents: 0,
  earlyEvents: 0,
  streakWeeks: 0,
};

export interface Progress {
  current: number;
  target: number;
  pct: number;
}

const STAT_KEY: Record<string, keyof BadgeStats> = {
  events: "events",
  hours: "hours",
  categories: "categories",
  weekend_events: "weekendEvents",
  early_events: "earlyEvents",
  streak_weeks: "streakWeeks",
};

export function progressToward(
  badge: Pick<BadgeDefinition, "criteria">,
  stats: BadgeStats,
): Progress {
  const target = Number(badge.criteria?.target ?? 0);
  const key = STAT_KEY[String(badge.criteria?.type ?? "")];
  const raw = key ? Number(stats[key]) : 0;
  const current = Number.isFinite(raw) && raw > 0 ? raw : 0;
  if (!Number.isFinite(target) || target <= 0) {
    return { current, target: 0, pct: 0 };
  }
  const pct = Math.min(100, Math.max(0, Math.round((current / target) * 100)));
  return { current: Math.min(current, target), target, pct };
}

export function isEarnedByStats(badge: Pick<BadgeDefinition, "criteria">, stats: BadgeStats): boolean {
  const p = progressToward(badge, stats);
  return p.target > 0 && p.pct >= 100;
}

// ---------- Streaks ----------

export interface StreakResult {
  currentWeeks: number;
  longestWeeks: number;
  /** Monday (YYYY-MM-DD) of the most recent active week, or null. */
  lastActiveWeek: string | null;
}

const DAY_MS = 86_400_000;

function parseYmd(s: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) return null;
  const t = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(t) ? null : t;
}

/** Index of the ISO week (Monday start) containing the given UTC-midnight timestamp. */
function weekIndex(t: number): number {
  // 1970-01-01 was a Thursday; Monday 1969-12-29 is day -3.
  return Math.floor((Math.floor(t / DAY_MS) + 3) / 7);
}

function weekStartYmd(idx: number): string {
  return new Date((idx * 7 - 3) * DAY_MS).toISOString().slice(0, 10);
}

/**
 * Consecutive ISO weeks with at least one verified event. Matches get_my_streak():
 * the current streak stays alive if the latest active week is this week or last week.
 */
export function computeStreak(dates: string[], today: string | Date): StreakResult {
  const weeks = new Set<number>();
  for (const d of dates) {
    const t = parseYmd(d);
    if (t !== null) weeks.add(weekIndex(t));
  }
  if (weeks.size === 0) return { currentWeeks: 0, longestWeeks: 0, lastActiveWeek: null };

  const sorted = [...weeks].sort((a, b) => a - b);
  let longest = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    run = sorted[i] === sorted[i - 1] + 1 ? run + 1 : 1;
    if (run > longest) longest = run;
  }
  // `run` is now the length of the final run (ends at the latest active week).
  const last = sorted[sorted.length - 1];

  const todayT =
    typeof today === "string"
      ? parseYmd(today)
      : Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const currentIdx = todayT === null ? null : weekIndex(todayT);
  const alive = currentIdx !== null && last >= currentIdx - 1;

  return {
    currentWeeks: alive ? run : 0,
    longestWeeks: longest,
    lastActiveWeek: weekStartYmd(last),
  };
}

/** True when the user already has a verified event in the week containing `today`. */
export function isActiveThisWeek(lastActiveWeek: string | null, today: string | Date): boolean {
  if (!lastActiveWeek) return false;
  const a = parseYmd(lastActiveWeek);
  const b =
    typeof today === "string"
      ? parseYmd(today)
      : Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  if (a === null || b === null) return false;
  return weekIndex(a) === weekIndex(b);
}

// ---------- Presentation ----------

export const BADGE_ICONS: Record<string, LucideIcon> = {
  Award,
  CalendarDays,
  Clock,
  Compass,
  Flame,
  Footprints,
  HeartHandshake,
  Medal,
  Sunrise,
  Trophy,
};

export function getBadgeIcon(name: string | null | undefined): LucideIcon {
  return (name && Object.prototype.hasOwnProperty.call(BADGE_ICONS, name) ? BADGE_ICONS[name] : undefined) ?? Award;
}

export const TIER_STYLES: Record<BadgeTier, { ring: string; text: string; bg: string; label: string }> = {
  bronze: { ring: "border-amber-700/50", text: "text-amber-700 dark:text-amber-500", bg: "bg-amber-700/10", label: "Bronze" },
  silver: { ring: "border-slate-400/60", text: "text-slate-500 dark:text-slate-300", bg: "bg-slate-400/10", label: "Silver" },
  gold: { ring: "border-yellow-500/60", text: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-500/10", label: "Gold" },
};

export function getTierStyle(tier: string | null | undefined) {
  return TIER_STYLES[(tier as BadgeTier) in TIER_STYLES ? (tier as BadgeTier) : "bronze"];
}
