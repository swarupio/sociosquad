import { describe, expect, it } from "vitest";
import { buildVerifyUrl, formatCode, formatPeriod, isPlausibleCode, maskName, normalizeCode } from "./certificates";

describe("certificates helpers", () => {
  it("normalizes codes", () => {
    expect(normalizeCode(" abcd-efgh jkmn ")).toBe("ABCDEFGHJKMN");
    expect(normalizeCode(null)).toBe("");
  });
  it("formats codes", () => {
    expect(formatCode("abcdefghjkmn")).toBe("ABCD-EFGH-JKMN");
    expect(formatCode("abc")).toBe("ABC");
  });
  it("checks plausibility", () => {
    expect(isPlausibleCode("ABCD-EFGH-JKMN")).toBe(true);
    expect(isPlausibleCode("ABCD-EFGH-JKM0")).toBe(false);
    expect(isPlausibleCode("short")).toBe(false);
  });
  it("builds verify url", () => {
    expect(buildVerifyUrl("https://x.org/", "abcd-efgh-jkmn")).toBe("https://x.org/verify/ABCDEFGHJKMN");
  });
  it("masks names", () => {
    expect(maskName("Asha Kulkarni")).toBe("Asha K.");
    expect(maskName("Asha Devi Kulkarni")).toBe("Asha K.");
    expect(maskName("Asha")).toBe("Asha");
    expect(maskName("  ")).toBe("Volunteer");
    expect(maskName(undefined)).toBe("Volunteer");
  });
  it("formats period", () => {
    expect(formatPeriod(null, null)).toBe("All time");
    expect(formatPeriod("2026-01-01", "2026-03-31")).toContain("2026");
    expect(formatPeriod("2026-01-01", null)).toMatch(/^Since/);
    expect(formatPeriod(null, "2026-03-31")).toMatch(/^Until/);
  });
});
