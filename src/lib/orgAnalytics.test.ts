import { describe, expect, it } from "vitest";
import {
  buildImpactReport,
  fillMissingWeeks,
  fillRate,
  formatHours,
  noShowRate,
  summarizeTrend,
} from "./orgAnalytics";

describe("rates", () => {
  it("fillRate clamps and guards", () => {
    expect(fillRate(5, 10)).toBe(0.5);
    expect(fillRate(20, 10)).toBe(1);
    expect(fillRate(5, 0)).toBe(0);
    expect(fillRate(5, null)).toBe(0);
  });
  it("noShowRate", () => {
    expect(noShowRate(10, 7)).toBeCloseTo(0.3);
    expect(noShowRate(0, 0)).toBe(0);
    expect(noShowRate(5, 9)).toBe(0);
  });
});

describe("fillMissingWeeks", () => {
  it("zero-fills gaps", () => {
    const out = fillMissingWeeks(
      [{ week_start: "2026-01-12", registrations: 3, attended: 2, hours: 4 }],
      { from: "2026-01-05", to: "2026-01-25" },
    );
    expect(out.map((p) => p.week_start)).toEqual(["2026-01-05", "2026-01-12", "2026-01-19"]);
    expect(out[1].registrations).toBe(3);
    expect(out[0].registrations).toBe(0);
  });
});

describe("summarizeTrend", () => {
  it("detects directions", () => {
    expect(summarizeTrend([1, 1, 3, 3]).direction).toBe("up");
    expect(summarizeTrend([4, 4, 1, 1])).toEqual({ direction: "down", changePct: -75 });
    expect(summarizeTrend([2, 2, 2, 2]).direction).toBe("flat");
    expect(summarizeTrend([5]).direction).toBe("flat");
  });
});

describe("formatHours / report", () => {
  it("formats hours", () => {
    expect(formatHours(0)).toBe("0 h");
    expect(formatHours(2.25)).toBe("2.3 h");
    expect(formatHours(null)).toBe("0 h");
  });
  it("builds report text", () => {
    const text = buildImpactReport(
      {
        opportunities: 4,
        registrations: 40,
        attended: 30,
        no_show_rate: 0.25,
        verified_hours: 120,
        unique_volunteers: 22,
        repeat_volunteers: 8,
        avg_fill_rate: 0.8,
      },
      "Helping Hands",
      { from: "2026-01-01", to: "2026-03-31" },
    );
    expect(text).toContain("Impact Report: Helping Hands");
    expect(text).toContain("Verified volunteer hours: 120 h");
    expect(text).toContain("No-show rate (past events): 25%");
  });
});
