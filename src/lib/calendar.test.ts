import { describe, it, expect } from "vitest";
import { buildIcs, escapeIcsText, foldIcsLine } from "./calendar";
import { formatDistance, haversineKm, isValidCoordinate } from "./geo";

const NOW = new Date(Date.UTC(2026, 0, 2, 3, 4, 5));

describe("escapeIcsText", () => {
  it("escapes separators, backslashes and newlines", () => {
    expect(escapeIcsText("a,b;c\\d\ne")).toBe("a\\,b\\;c\\\\d\\ne");
  });
});

describe("foldIcsLine", () => {
  it("leaves short lines alone and folds long ones at 75 chars", () => {
    expect(foldIcsLine("short")).toBe("short");
    const folded = foldIcsLine("x".repeat(200)).split("\r\n");
    expect(folded[0]).toHaveLength(75);
    expect(folded.slice(1).every((l) => l.startsWith(" ") && l.length <= 75)).toBe(true);
    expect(folded.join("").replace(/ /g, "")).toBe("x".repeat(200));
  });
});

describe("buildIcs", () => {
  it("builds a valid event with times, escaping and CRLF endings", () => {
    const ics = buildIcs(
      { id: "abc", title: "Beach, Cleanup", date: "2026-03-05", startTime: "09:30:00", endTime: "11:00", location: "Juhu; Mumbai" },
      NOW
    );
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics).toContain("UID:abc@sociosquad");
    expect(ics).toContain("DTSTAMP:20260102T030405Z");
    expect(ics).toContain("DTSTART:20260305T093000");
    expect(ics).toContain("DTEND:20260305T110000");
    expect(ics).toContain("SUMMARY:Beach\\, Cleanup");
    expect(ics).toContain("LOCATION:Juhu\\; Mumbai");
  });

  it("defaults to 09:00 and a 2h duration, and fixes an end before the start", () => {
    const a = buildIcs({ id: "1", title: "t", date: "2026-03-05" }, NOW);
    expect(a).toContain("DTSTART:20260305T090000");
    expect(a).toContain("DTEND:20260305T110000");
    const b = buildIcs({ id: "1", title: "t", date: "2026-03-05", startTime: "10:00", endTime: "09:00" }, NOW);
    expect(b).toContain("DTEND:20260305T120000");
  });

  it("rolls over midnight", () => {
    const ics = buildIcs({ id: "1", title: "t", date: "2026-03-05", startTime: "23:00" }, NOW);
    expect(ics).toContain("DTEND:20260306T010000");
  });

  it("rejects a missing or malformed date", () => {
    expect(() => buildIcs({ id: "1", title: "t", date: "5 Mar" }, NOW)).toThrow();
  });
});

describe("geo", () => {
  it("computes realistic distances", () => {
    const mumbai = { latitude: 19.076, longitude: 72.8777 };
    const pune = { latitude: 18.5204, longitude: 73.8567 };
    expect(haversineKm(mumbai, mumbai)).toBeCloseTo(0, 5);
    expect(haversineKm(mumbai, pune)).toBeGreaterThan(110);
    expect(haversineKm(mumbai, pune)).toBeLessThan(125);
  });

  it("formats distances", () => {
    expect(formatDistance(0.3)).toBe("300 m away");
    expect(formatDistance(2.46)).toBe("2.5 km away");
    expect(formatDistance(42.4)).toBe("42 km away");
    expect(formatDistance(NaN)).toBe("");
  });

  it("validates coordinates", () => {
    expect(isValidCoordinate(19, 72)).toBe(true);
    expect(isValidCoordinate(null, 72)).toBe(false);
    expect(isValidCoordinate(91, 72)).toBe(false);
    expect(isValidCoordinate(NaN, 0)).toBe(false);
  });
});
