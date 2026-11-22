import { describe, expect, it } from "vitest";
import {
  EMPTY_STATS,
  computeStreak,
  getBadgeIcon,
  getTierStyle,
  isActiveThisWeek,
  isEarnedByStats,
  progressToward,
} from "./badges";
import { Award, Flame } from "lucide-react";

describe("progressToward", () => {
  it("computes percentage and clamps", () => {
    const b = { criteria: { type: "hours", target: 10 } };
    expect(progressToward(b, { ...EMPTY_STATS, hours: 5 })).toEqual({ current: 5, target: 10, pct: 50 });
    expect(progressToward(b, { ...EMPTY_STATS, hours: 25 })).toEqual({ current: 10, target: 10, pct: 100 });
  });
  it("maps every criteria type", () => {
    const s = { events: 2, hours: 3, categories: 1, weekendEvents: 2, earlyEvents: 1, streakWeeks: 3 };
    expect(progressToward({ criteria: { type: "events", target: 4 } }, s).pct).toBe(50);
    expect(progressToward({ criteria: { type: "categories", target: 3 } }, s).pct).toBe(33);
    expect(progressToward({ criteria: { type: "weekend_events", target: 4 } }, s).pct).toBe(50);
    expect(progressToward({ criteria: { type: "early_events", target: 4 } }, s).pct).toBe(25);
    expect(progressToward({ criteria: { type: "streak_weeks", target: 4 } }, s).pct).toBe(75);
  });
  it("handles bad criteria", () => {
    expect(progressToward({ criteria: null }, EMPTY_STATS)).toEqual({ current: 0, target: 0, pct: 0 });
    expect(progressToward({ criteria: { type: "nope", target: 5 } }, EMPTY_STATS).pct).toBe(0);
    expect(isEarnedByStats({ criteria: { type: "events", target: 1 } }, { ...EMPTY_STATS, events: 1 })).toBe(true);
    expect(isEarnedByStats({ criteria: null }, EMPTY_STATS)).toBe(false);
  });
});

describe("computeStreak", () => {
  // 2026-11-22 is a Sunday (ISO week starting Mon 2026-11-16)
  const today = "2026-11-22";
  it("empty", () => {
    expect(computeStreak([], today)).toEqual({ currentWeeks: 0, longestWeeks: 0, lastActiveWeek: null });
  });
  it("ignores invalid dates", () => {
    expect(computeStreak(["garbage", ""], today).longestWeeks).toBe(0);
  });
  it("dedupes events in the same week", () => {
    const r = computeStreak(["2026-11-16", "2026-11-17", "2026-11-22"], today);
    expect(r).toEqual({ currentWeeks: 1, longestWeeks: 1, lastActiveWeek: "2026-11-16" });
  });
  it("Sunday and next Monday are different weeks", () => {
    const r = computeStreak(["2026-11-15", "2026-11-16"], today);
    expect(r.currentWeeks).toBe(2);
  });
  it("streak alive when only previous week active", () => {
    const r = computeStreak(["2026-11-02", "2026-11-09"], today);
    expect(r.currentWeeks).toBe(2);
    expect(isActiveThisWeek(r.lastActiveWeek, today)).toBe(false);
  });
  it("streak broken after a missed full week", () => {
    const r = computeStreak(["2026-11-02", "2026-11-03"], today);
    expect(r.currentWeeks).toBe(0);
    expect(r.longestWeeks).toBe(1);
  });
  it("longest differs from current", () => {
    const r = computeStreak(["2026-09-07", "2026-09-14", "2026-09-21", "2026-09-28", "2026-11-17"], today);
    expect(r.longestWeeks).toBe(4);
    expect(r.currentWeeks).toBe(1);
  });
  it("year rollover", () => {
    // 2025-12-29 (Mon) and 2026-01-05 (Mon) are consecutive weeks
    const r = computeStreak(["2025-12-31", "2026-01-02", "2026-01-06"], "2026-01-08");
    expect(r.currentWeeks).toBe(2);
    expect(r.lastActiveWeek).toBe("2026-01-05");
  });
  it("accepts Date and timestamp strings", () => {
    const r = computeStreak(["2026-11-16T10:00:00Z"], new Date(2026, 10, 22));
    expect(r.currentWeeks).toBe(1);
  });
  it("order independent", () => {
    const a = computeStreak(["2026-11-16", "2026-11-09", "2026-11-02"], today);
    const b = computeStreak(["2026-11-02", "2026-11-16", "2026-11-09"], today);
    expect(a).toEqual(b);
    expect(a.currentWeeks).toBe(3);
  });
});

describe("presentation helpers", () => {
  it("falls back to Award icon", () => {
    expect(getBadgeIcon("Flame")).toBe(Flame);
    expect(getBadgeIcon("Nope")).toBe(Award);
    expect(getBadgeIcon("toString")).toBe(Award);
    expect(getBadgeIcon(undefined)).toBe(Award);
  });
  it("falls back to bronze tier", () => {
    expect(getTierStyle("gold").label).toBe("Gold");
    expect(getTierStyle("weird").label).toBe("Bronze");
    expect(getTierStyle(null).label).toBe("Bronze");
  });
});
