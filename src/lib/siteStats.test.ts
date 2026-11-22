import { describe, it, expect } from "vitest";
import { siteStats, ILLUSTRATIVE_FOOTNOTE } from "./siteStats";

describe("siteStats", () => {
  it("has finite positive numeric values", () => {
    const entries = [
      siteStats.volunteers,
      siteStats.countries,
      siteStats.ngoPartners,
      siteStats.hoursVolunteered,
      siteStats.satisfactionRate,
    ];
    for (const e of entries) {
      expect(Number.isFinite(e.value)).toBe(true);
      expect(e.value).toBeGreaterThan(0);
    }
  });

  it("keeps satisfaction rate within 100", () => {
    expect(siteStats.satisfactionRate.value).toBeLessThanOrEqual(100);
  });

  it("has cause counts and a footnote", () => {
    expect(Object.keys(siteStats.causeCounts).length).toBeGreaterThan(0);
    expect(ILLUSTRATIVE_FOOTNOTE.length).toBeGreaterThan(0);
  });
});
