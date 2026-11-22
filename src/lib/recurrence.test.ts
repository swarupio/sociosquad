import { describe, it, expect } from "vitest";
import {
  generateOccurrenceDates,
  describeRecurrence,
  validateRecurrence,
  addDays,
  addMonthsClamped,
  parseYmd,
} from "./recurrence";

describe("generateOccurrenceDates", () => {
  it("weekly adds 7 days", () => {
    expect(generateOccurrenceDates({ rule: "weekly", startsOn: "2026-03-01", occurrences: 3 })).toEqual([
      "2026-03-01",
      "2026-03-08",
      "2026-03-15",
    ]);
  });
  it("biweekly adds 14 days and crosses year end", () => {
    expect(generateOccurrenceDates({ rule: "biweekly", startsOn: "2026-12-20", occurrences: 3 })).toEqual([
      "2026-12-20",
      "2027-01-03",
      "2027-01-17",
    ]);
  });
  it("monthly clamps Jan 31 to Feb end, non-cumulatively", () => {
    expect(generateOccurrenceDates({ rule: "monthly", startsOn: "2027-01-31", occurrences: 4 })).toEqual([
      "2027-01-31",
      "2027-02-28",
      "2027-03-31",
      "2027-04-30",
    ]);
  });
  it("monthly handles leap years", () => {
    expect(generateOccurrenceDates({ rule: "monthly", startsOn: "2028-01-31", occurrences: 2 })[1]).toBe("2028-02-29");
    expect(generateOccurrenceDates({ rule: "monthly", startsOn: "2028-02-29", occurrences: 13 })[12]).toBe("2029-02-28");
  });
  it("monthly rolls over December", () => {
    expect(generateOccurrenceDates({ rule: "monthly", startsOn: "2026-12-15", occurrences: 3 })).toEqual([
      "2026-12-15",
      "2027-01-15",
      "2027-02-15",
    ]);
  });
  it("is unaffected by DST transitions", () => {
    const d = generateOccurrenceDates({ rule: "weekly", startsOn: "2026-03-01", occurrences: 6 });
    expect(d[4]).toBe("2026-03-29");
    expect(d[5]).toBe("2026-04-05");
  });
  it("respects limits", () => {
    expect(generateOccurrenceDates({ rule: "weekly", startsOn: "2026-01-01", occurrences: 52 })).toHaveLength(52);
    expect(generateOccurrenceDates({ rule: "weekly", startsOn: "2026-01-01", occurrences: 53 })).toEqual([]);
    expect(generateOccurrenceDates({ rule: "weekly", startsOn: "2026-01-01", occurrences: 1 })).toEqual([]);
    expect(generateOccurrenceDates({ rule: "weekly", startsOn: "bad", occurrences: 3 })).toEqual([]);
  });
});

describe("helpers", () => {
  it("parseYmd rejects impossible dates", () => {
    expect(parseYmd("2026-02-30")).toBeNull();
    expect(parseYmd("2026-2-3")).toBeNull();
    expect(parseYmd("2026-02-28")).toEqual({ y: 2026, m: 2, d: 28 });
  });
  it("addDays and addMonthsClamped", () => {
    expect(addDays("2026-02-27", 3)).toBe("2026-03-02");
    expect(addMonthsClamped("2026-05-31", 1)).toBe("2026-06-30");
  });
  it("validateRecurrence", () => {
    expect(validateRecurrence({ rule: "weekly", startsOn: "2026-01-01", occurrences: 4 })).toBeNull();
    expect(validateRecurrence({ rule: "daily", startsOn: "2026-01-01", occurrences: 4 })).toMatch(/often/);
    expect(validateRecurrence({ rule: "weekly", startsOn: "", occurrences: 4 })).toMatch(/start date/);
    expect(validateRecurrence({ rule: "weekly", startsOn: "2026-01-01", occurrences: 2.5 })).toMatch(/whole/);
    expect(validateRecurrence({ rule: "weekly", startsOn: "2026-01-01", occurrences: 60 })).toMatch(/between/);
  });
  it("describeRecurrence", () => {
    const t = describeRecurrence("weekly", "2026-03-01", 4);
    expect(t).toContain("Repeats weekly on Sundays, 4 times");
    expect(describeRecurrence("monthly", "2026-03-15", 3)).toContain("on day 15");
    expect(describeRecurrence("biweekly", "bad", 3)).toBe("Repeats every 2 weeks");
  });
});
