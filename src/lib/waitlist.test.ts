import { describe, expect, it } from "vitest";
import { capacityState, fillRatio, parseRegisterResult, spotsLabel } from "./waitlist";

describe("capacityState", () => {
  it("handles states", () => {
    expect(capacityState(0, 10)).toBe("open");
    expect(capacityState(8, 10)).toBe("filling");
    expect(capacityState(10, 10)).toBe("full");
    expect(capacityState(10, 10, 3)).toBe("waitlist");
    expect(capacityState(50, null)).toBe("open");
  });
});

describe("spotsLabel", () => {
  it("formats", () => {
    expect(spotsLabel(9, 10)).toBe("1 spot left");
    expect(spotsLabel(5, 10)).toBe("5 spots left");
    expect(spotsLabel(10, 10)).toBe("Full");
    expect(spotsLabel(10, 10, 2)).toBe("Full - 2 on waitlist");
    expect(spotsLabel(4, 0)).toBe("4 registered");
  });
});

describe("fillRatio", () => {
  it("clamps", () => {
    expect(fillRatio(15, 10)).toBe(1);
    expect(fillRatio(1, 0)).toBe(0);
    expect(fillRatio(5, 10)).toBe(0.5);
  });
});

describe("parseRegisterResult", () => {
  it("parses", () => {
    expect(parseRegisterResult({ status: "registered", position: null })).toEqual({
      status: "registered",
      position: null,
    });
    expect(parseRegisterResult('{"status":"waitlisted","position":3}')).toEqual({
      status: "waitlisted",
      position: 3,
    });
  });
  it("throws on junk", () => {
    expect(() => parseRegisterResult(null)).toThrow();
    expect(() => parseRegisterResult({ status: "x" })).toThrow();
  });
});
