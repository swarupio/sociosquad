import { describe, expect, it } from "vitest";
import { escapeCsvCell, toCsv } from "./csv";

describe("escapeCsvCell", () => {
  it("handles null/undefined", () => {
    expect(escapeCsvCell(null)).toBe("");
    expect(escapeCsvCell(undefined)).toBe("");
  });
  it("quotes commas, quotes and newlines", () => {
    expect(escapeCsvCell("a,b")).toBe('"a,b"');
    expect(escapeCsvCell('say "hi"')).toBe('"say ""hi"""');
    expect(escapeCsvCell("a\nb")).toBe('"a\nb"');
  });
  it("protects against formula injection", () => {
    expect(escapeCsvCell("=SUM(A1)")).toBe("'=SUM(A1)");
    expect(escapeCsvCell("+1")).toBe("'+1");
    expect(escapeCsvCell("-1+2")).toBe("'-1+2");
    expect(escapeCsvCell("@cmd")).toBe("'@cmd");
    expect(escapeCsvCell("\tx")).toBe("'\tx");
    expect(escapeCsvCell("=1,2")).toBe('"\'=1,2"');
  });
  it("keeps negative numbers and unicode", () => {
    expect(escapeCsvCell(-5)).toBe("-5");
    expect(escapeCsvCell("स्वयंसेवक ✓")).toBe("स्वयंसेवक ✓");
  });
});

describe("toCsv", () => {
  const cols = [
    { header: "Name", value: (r: { n: string; v: number }) => r.n },
    { header: "Val", value: (r: { n: string; v: number }) => r.v },
  ];
  it("builds CRLF rows", () => {
    expect(toCsv([{ n: "a", v: 1 }], cols)).toBe("Name,Val\r\na,1\r\n");
  });
  it("adds BOM when requested", () => {
    expect(toCsv([], cols, { bom: true }).startsWith("﻿")).toBe(true);
  });
});
