import { describe, expect, it } from "vitest";
import {
  buildCheckinUrl,
  formatCode,
  formatCountdown,
  isValidCode,
  normalizeCode,
  parseCheckinInput,
  secondsUntil,
} from "./checkin";

describe("checkin helpers", () => {
  it("normalizes separators, case and ambiguous characters", () => {
    expect(normalizeCode(" ab3d-ef9h ")).toBe("AB3DEF9H");
    expect(normalizeCode("OIL0")).toBe("0110");
  });

  it("validates codes", () => {
    expect(isValidCode("AB3DEF9H")).toBe(true);
    expect(isValidCode("AB3DEF9")).toBe(false);
    expect(isValidCode("AB3DEF9U")).toBe(false);
  });

  it("formats codes", () => {
    expect(formatCode("ab3def9h")).toBe("AB3D-EF9H");
    expect(formatCode("ab3")).toBe("AB3");
  });

  it("builds urls", () => {
    expect(buildCheckinUrl("https://x.org/", "ab3d-ef9h")).toBe("https://x.org/check-in?code=AB3DEF9H");
  });

  it("parses raw codes and urls", () => {
    expect(parseCheckinInput("ab3d ef9h")).toBe("AB3DEF9H");
    expect(parseCheckinInput("https://x.org/check-in?code=AB3D-EF9H")).toBe("AB3DEF9H");
    expect(parseCheckinInput("/check-in?code=AB3DEF9H")).toBe("AB3DEF9H");
    expect(parseCheckinInput("https://x.org/check-in")).toBeNull();
    expect(parseCheckinInput("nope")).toBeNull();
    expect(parseCheckinInput("")).toBeNull();
  });

  it("computes countdowns", () => {
    const now = Date.parse("2026-01-01T00:00:00Z");
    expect(secondsUntil("2026-01-01T00:01:05Z", now)).toBe(65);
    expect(secondsUntil("2025-01-01T00:00:00Z", now)).toBe(0);
    expect(secondsUntil("garbage", now)).toBe(0);
    expect(formatCountdown(65)).toBe("01:05");
    expect(formatCountdown(3725)).toBe("1:02:05");
  });
});
