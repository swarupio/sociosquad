import { haversineKm, isValidCoordinate } from "@/lib/geo";

export const CAUSES = ["Environment", "Education", "Healthcare", "Community", "General"] as const;

export const AVAILABILITY_OPTIONS = [
  { value: "weekday-morning", label: "Weekday mornings" },
  { value: "weekday-afternoon", label: "Weekday afternoons" },
  { value: "weekday-evening", label: "Weekday evenings" },
  { value: "weekend-morning", label: "Weekend mornings" },
  { value: "weekend-afternoon", label: "Weekend afternoons" },
  { value: "weekend-evening", label: "Weekend evenings" },
] as const;

export const SKILL_SUGGESTIONS = [
  "Teaching",
  "First Aid",
  "Cooking",
  "Photography",
  "Event Management",
  "Fundraising",
  "Social Media",
  "Gardening",
  "Counselling",
  "Driving",
  "Design",
  "Translation",
] as const;

export interface MatchPreferences {
  skills: string[];
  causes: string[];
  max_distance_km: number | null;
  availability: string[];
  home_latitude: number | null;
  home_longitude: number | null;
}

export interface MatchOpportunity {
  id?: string;
  category?: string | null;
  skills_needed?: string[] | null;
  latitude?: number | null;
  longitude?: number | null;
  date?: string | null;
  start_time?: string | null;
  max_volunteers?: number | null;
  registered_count?: number | null;
}

export interface MatchBreakdown {
  skills: number | null;
  cause: number | null;
  distance: number | null;
  availability: number | null;
  urgency: number;
}

export interface MatchResult {
  /** 0-100, or null when there is nothing to match on. */
  score: number | null;
  reasons: string[];
  breakdown: MatchBreakdown;
}

const WEIGHTS = { skills: 40, cause: 25, distance: 20, availability: 15 } as const;
const URGENCY_MAX_BONUS = 5;
const DEFAULT_RADIUS_KM = 50;

const SYNONYMS: Record<string, string> = {
  teach: "teaching",
  teacher: "teaching",
  tutoring: "teaching",
  tutor: "teaching",
  education: "teaching",
  firstaid: "first aid",
  "first-aid": "first aid",
  medical: "first aid",
  cook: "cooking",
  chef: "cooking",
  photo: "photography",
  photos: "photography",
  events: "event management",
  "event planning": "event management",
  "event organising": "event management",
  "event organizing": "event management",
  fundraise: "fundraising",
  "fund raising": "fundraising",
  "social media marketing": "social media",
  garden: "gardening",
  counseling: "counselling",
  counsellor: "counselling",
  counselor: "counselling",
  drive: "driving",
  graphic: "design",
  "graphic design": "design",
  translate: "translation",
  translator: "translation",
};

export function normalizeSkill(raw: string): string {
  const s = raw.trim().toLowerCase().replace(/\s+/g, " ");
  return SYNONYMS[s] ?? s;
}

function normalizedSet(list: readonly string[] | null | undefined): Set<string> {
  const out = new Set<string>();
  for (const item of list ?? []) {
    if (typeof item !== "string") continue;
    const n = normalizeSkill(item);
    if (n) out.add(n);
  }
  return out;
}

export function hasPreferences(prefs: MatchPreferences | null | undefined): boolean {
  if (!prefs) return false;
  return (
    prefs.skills.length > 0 ||
    prefs.causes.length > 0 ||
    prefs.availability.length > 0 ||
    isValidCoordinate(prefs.home_latitude, prefs.home_longitude)
  );
}

/** Parse "YYYY-MM-DD" as a local date (avoids UTC shifts). */
function parseLocalDate(date: string | null | undefined, startTime?: string | null): Date | null {
  if (!date) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
  if (!m) return null;
  let hh = 0;
  let mm = 0;
  if (startTime) {
    const t = /^(\d{1,2}):(\d{2})/.exec(startTime);
    if (t) {
      hh = Number(t[1]);
      mm = Number(t[2]);
    }
  }
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), hh, mm);
  return Number.isNaN(d.getTime()) ? null : d;
}

export type DayPart = "morning" | "afternoon" | "evening";

export function dayPartOf(startTime: string | null | undefined): DayPart | null {
  const t = startTime ? /^(\d{1,2}):(\d{2})/.exec(startTime) : null;
  if (!t) return null;
  const h = Number(t[1]);
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

function scoreSkills(prefs: MatchPreferences, opp: MatchOpportunity, reasons: string[]): number | null {
  const needed = normalizedSet(opp.skills_needed);
  const mine = normalizedSet(prefs.skills);
  if (needed.size === 0 || mine.size === 0) return null;
  const overlap = [...needed].filter((s) => mine.has(s));
  if (overlap.length > 0) {
    reasons.push(`Uses your skills: ${overlap.join(", ")}`);
  }
  return overlap.length / needed.size;
}

function scoreCause(prefs: MatchPreferences, opp: MatchOpportunity, reasons: string[]): number | null {
  const category = opp.category?.trim().toLowerCase();
  if (!category || prefs.causes.length === 0) return null;
  const hit = prefs.causes.some((c) => c.trim().toLowerCase() === category);
  if (hit) reasons.push(`Matches your interest in ${opp.category}`);
  return hit ? 1 : 0;
}

function scoreDistance(prefs: MatchPreferences, opp: MatchOpportunity, reasons: string[]): number | null {
  if (!isValidCoordinate(prefs.home_latitude, prefs.home_longitude)) return null;
  if (!isValidCoordinate(opp.latitude, opp.longitude)) return null;
  const km = haversineKm(
    { latitude: prefs.home_latitude as number, longitude: prefs.home_longitude as number },
    { latitude: opp.latitude as number, longitude: opp.longitude as number }
  );
  const max = prefs.max_distance_km && prefs.max_distance_km > 0 ? prefs.max_distance_km : DEFAULT_RADIUS_KM;
  let fraction: number;
  if (km <= max) {
    fraction = 1 - 0.4 * (km / max);
    reasons.push(km < 1 ? "Right next to you" : `About ${Math.round(km)} km away`);
  } else {
    // Linearly fades from 0.6 at the limit to 0 at twice the limit.
    fraction = Math.max(0, 0.6 * (1 - (km - max) / max));
  }
  return fraction;
}

function scoreAvailability(prefs: MatchPreferences, opp: MatchOpportunity, reasons: string[]): number | null {
  if (prefs.availability.length === 0) return null;
  const when = parseLocalDate(opp.date, opp.start_time);
  if (!when) return null;
  const dow = when.getDay();
  const dayType = dow === 0 || dow === 6 ? "weekend" : "weekday";
  const part = dayPartOf(opp.start_time);
  const avail = new Set(prefs.availability.map((a) => a.trim().toLowerCase()));

  const exact = part ? avail.has(`${dayType}-${part}`) : false;
  const sameDay = [...avail].some((a) => a === dayType || a.startsWith(`${dayType}-`));
  if (exact || (!part && sameDay) || avail.has(dayType)) {
    reasons.push(part ? `Fits your ${dayType} ${part} availability` : `Fits your ${dayType} availability`);
    return 1;
  }
  return sameDay ? 0.4 : 0;
}

function urgencyBonus(opp: MatchOpportunity, now: Date, reasons: string[]): number {
  const when = parseLocalDate(opp.date, opp.start_time);
  if (!when) return 0;
  const days = (when.getTime() - now.getTime()) / 86_400_000;
  if (days < 0 || days > 7) return 0;
  let bonus = URGENCY_MAX_BONUS * (1 - days / 7) * 0.6;
  const max = opp.max_volunteers ?? 0;
  const reg = opp.registered_count ?? 0;
  if (max > 0) {
    const left = max - reg;
    if (left <= 0) return 0;
    if (left / max <= 0.25) {
      bonus += URGENCY_MAX_BONUS * 0.4;
      reasons.push("Only a few spots left");
    }
  }
  if (days <= 3) reasons.push("Happening soon");
  return Math.min(URGENCY_MAX_BONUS, bonus);
}

export function scoreOpportunity(
  prefs: MatchPreferences | null | undefined,
  opp: MatchOpportunity,
  now: Date = new Date()
): MatchResult {
  const breakdown: MatchBreakdown = { skills: null, cause: null, distance: null, availability: null, urgency: 0 };
  const reasons: string[] = [];
  if (!prefs || !hasPreferences(prefs)) return { score: null, reasons, breakdown };

  // Opportunities that already happened are never recommended.
  const when = parseLocalDate(opp.date, opp.start_time);
  if (when) {
    const endOfDay = new Date(when.getFullYear(), when.getMonth(), when.getDate(), 23, 59, 59);
    if (endOfDay.getTime() < now.getTime()) return { score: 0, reasons: ["Already happened"], breakdown };
  }

  breakdown.skills = scoreSkills(prefs, opp, reasons);
  breakdown.cause = scoreCause(prefs, opp, reasons);
  breakdown.distance = scoreDistance(prefs, opp, reasons);
  breakdown.availability = scoreAvailability(prefs, opp, reasons);

  let weighted = 0;
  let totalWeight = 0;
  (["skills", "cause", "distance", "availability"] as const).forEach((key) => {
    const v = breakdown[key];
    if (v === null) return;
    weighted += WEIGHTS[key] * v;
    totalWeight += WEIGHTS[key];
  });
  if (totalWeight === 0) return { score: null, reasons, breakdown };

  const base = (weighted / totalWeight) * 100;
  const bonus = base > 0 ? urgencyBonus(opp, now, reasons) : 0;
  breakdown.urgency = Math.round(bonus * 10) / 10;
  const score = Math.max(0, Math.min(100, Math.round(base + bonus)));
  return { score, reasons, breakdown };
}

export interface RankedOpportunity<T extends MatchOpportunity> {
  opportunity: T;
  match: MatchResult;
}

/** Score and sort descending; unscored (null) items go last, original order preserved on ties. */
export function rankOpportunities<T extends MatchOpportunity>(
  prefs: MatchPreferences | null | undefined,
  opportunities: readonly T[],
  options: { now?: Date; minScore?: number; limit?: number } = {}
): RankedOpportunity<T>[] {
  const now = options.now ?? new Date();
  const ranked = opportunities
    .map((opportunity, index) => ({ opportunity, match: scoreOpportunity(prefs, opportunity, now), index }))
    .filter((r) => options.minScore === undefined || (r.match.score ?? -1) >= options.minScore)
    .sort((a, b) => {
      const sa = a.match.score ?? -1;
      const sb = b.match.score ?? -1;
      return sb - sa || a.index - b.index;
    })
    .map(({ opportunity, match }) => ({ opportunity, match }));
  return options.limit !== undefined ? ranked.slice(0, options.limit) : ranked;
}

export type MatchTier = "high" | "medium" | "low";

export function matchTier(score: number): MatchTier {
  if (score >= 75) return "high";
  if (score >= 45) return "medium";
  return "low";
}
