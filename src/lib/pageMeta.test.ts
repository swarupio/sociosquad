// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { buildTitle, truncateDescription, absoluteUrl } from "./pageMeta";

describe("pageMeta", () => {
  it("builds titles", () => {
    expect(buildTitle("Events")).toBe("Events | SocioSquad");
    expect(buildTitle("")).toBe("SocioSquad");
    expect(buildTitle("SocioSquad")).toBe("SocioSquad");
  });
  it("truncates on word boundary", () => {
    const long = "word ".repeat(60);
    const out = truncateDescription(long);
    expect(out.length).toBeLessThanOrEqual(155);
    expect(out.endsWith("…")).toBe(true);
    expect(out).not.toMatch(/wor…$/);
    expect(truncateDescription("  short   text ")).toBe("short text");
  });
  it("makes absolute urls", () => {
    expect(absoluteUrl("/a", "https://x.com/")).toBe("https://x.com/a");
    expect(absoluteUrl("a", "https://x.com")).toBe("https://x.com/a");
    expect(absoluteUrl("https://y.com/i.png", "https://x.com")).toBe("https://y.com/i.png");
  });
});
