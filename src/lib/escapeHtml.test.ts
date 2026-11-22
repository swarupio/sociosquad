import { describe, it, expect } from "vitest";
import { escapeHtml, safeNumber } from "./escapeHtml";

describe("escapeHtml", () => {
  it("escapes script tags", () => {
    expect(escapeHtml("<script>alert(1)</script>")).toBe("&lt;script&gt;alert(1)&lt;/script&gt;");
  });

  it("escapes quotes and ampersands", () => {
    expect(escapeHtml(`a & b "c" 'd'`)).toBe("a &amp; b &quot;c&quot; &#39;d&#39;");
  });

  it("does not double-escape in a single pass", () => {
    expect(escapeHtml("&lt;")).toBe("&amp;lt;");
  });

  it("handles non-strings", () => {
    expect(escapeHtml(null)).toBe("");
    expect(escapeHtml(undefined)).toBe("");
    expect(escapeHtml(42)).toBe("42");
    expect(escapeHtml(false)).toBe("false");
  });
});

describe("safeNumber", () => {
  it("returns finite numbers", () => {
    expect(safeNumber(5)).toBe(5);
    expect(safeNumber("3.5")).toBe(3.5);
  });

  it("falls back for NaN and Infinity", () => {
    expect(safeNumber(NaN)).toBe(0);
    expect(safeNumber("abc", 7)).toBe(7);
    expect(safeNumber(Infinity, -1)).toBe(-1);
  });
});
