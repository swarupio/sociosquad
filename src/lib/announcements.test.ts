import { describe, expect, it } from "vitest";
import { groupPinnedFirst, relativeTime, sanitizeText, truncate, validateAnnouncement } from "./announcements";

describe("sanitizeText", () => {
  it("normalises newlines, strips control chars and trims", () => {
    expect(sanitizeText("  a\r\nb\u0000c  ")).toBe("a\nbc");
  });
  it("collapses excessive blank lines", () => {
    expect(sanitizeText("a\n\n\n\n\nb")).toBe("a\n\n\nb");
  });
});

describe("validateAnnouncement", () => {
  it("accepts valid input", () => {
    const r = validateAnnouncement({ title: "Venue changed", body: "Now at Hall B" });
    expect(r.valid).toBe(true);
  });
  it("rejects short title and empty body", () => {
    const r = validateAnnouncement({ title: "ab", body: "   " });
    expect(r.valid).toBe(false);
    expect(r.errors.title).toBeDefined();
    expect(r.errors.body).toBeDefined();
  });
  it("rejects too long values", () => {
    const r = validateAnnouncement({ title: "x".repeat(121), body: "y".repeat(2001) });
    expect(r.errors.title).toBeDefined();
    expect(r.errors.body).toBeDefined();
  });
});

describe("truncate", () => {
  it("leaves short text", () => expect(truncate("abc", 5)).toBe("abc"));
  it("adds ellipsis", () => expect(truncate("abcdefgh", 5)).toBe("abcd…"));
});

describe("groupPinnedFirst", () => {
  it("orders pinned first then newest", () => {
    const items = [
      { id: 1, pinned: false, created_at: "2026-01-02T00:00:00Z" },
      { id: 2, pinned: true, created_at: "2026-01-01T00:00:00Z" },
      { id: 3, pinned: false, created_at: "2026-01-03T00:00:00Z" },
    ];
    expect(groupPinnedFirst(items).map((i) => i.id)).toEqual([2, 3, 1]);
    expect(items[0].id).toBe(1);
  });
});

describe("relativeTime", () => {
  const now = new Date("2026-06-01T12:00:00Z");
  it("formats ranges", () => {
    expect(relativeTime("2026-06-01T11:59:50Z", now)).toBe("just now");
    expect(relativeTime("2026-06-01T11:30:00Z", now)).toBe("30m ago");
    expect(relativeTime("2026-06-01T09:00:00Z", now)).toBe("3h ago");
    expect(relativeTime("2026-05-29T12:00:00Z", now)).toBe("3d ago");
    expect(relativeTime("bad", now)).toBe("");
  });
});
