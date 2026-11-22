import { describe, it, expect } from "vitest";
import {
  groupByDay,
  relativeTime,
  unreadCount,
  reminderSchedule,
  hasFired,
  markFired,
  eventStartMs,
  type KeyStore,
} from "./notifications";

const now = new Date(2026, 5, 10, 12, 0, 0);

describe("unreadCount", () => {
  it("counts items without read_at", () => {
    expect(unreadCount([{ read_at: null }, { read_at: "x" }, { read_at: null }])).toBe(2);
    expect(unreadCount([])).toBe(0);
  });
});

describe("groupByDay", () => {
  it("labels today, yesterday and older, preserving order", () => {
    const items = [
      { id: 1, created_at: new Date(2026, 5, 10, 9).toISOString() },
      { id: 2, created_at: new Date(2026, 5, 10, 8).toISOString() },
      { id: 3, created_at: new Date(2026, 5, 9, 20).toISOString() },
      { id: 4, created_at: new Date(2026, 4, 1, 10).toISOString() },
    ];
    const g = groupByDay(items, now);
    expect(g.map((x) => x.label).slice(0, 2)).toEqual(["Today", "Yesterday"]);
    expect(g[0].items.map((i) => i.id)).toEqual([1, 2]);
    expect(g).toHaveLength(3);
  });
  it("skips invalid dates", () => {
    expect(groupByDay([{ created_at: "nope" }], now)).toEqual([]);
  });
});

describe("relativeTime", () => {
  it("formats ranges", () => {
    const ago = (ms: number) => new Date(now.getTime() - ms).toISOString();
    expect(relativeTime(ago(10_000), now)).toBe("just now");
    expect(relativeTime(ago(5 * 60_000), now)).toBe("5m ago");
    expect(relativeTime(ago(3 * 3600_000), now)).toBe("3h ago");
    expect(relativeTime(ago(2 * 86400_000), now)).toBe("2d ago");
    expect(relativeTime("bad", now)).toBe("");
  });
});

describe("reminderSchedule", () => {
  it("returns upcoming reminders within the 48h horizon, sorted", () => {
    const events = [
      { id: "a", title: "A", date: "2026-06-11", start_time: "15:00:00" }, // 27h away
      { id: "b", title: "B", date: "2026-06-10", start_time: "13:30" }, // 1.5h away
      { id: "c", title: "C", date: "2026-06-20", start_time: "10:00" }, // too far
      { id: "d", title: "D", date: "2026-06-09", start_time: "10:00" }, // past
    ];
    const r = reminderSchedule(events, now);
    // a: 24h-before is 3h away (ok), 1h-before is 26h away (ok); b: 24h-before past, 1h-before in 0.5h
    expect(r.map((x) => `${x.eventId}:${x.offsetMinutes}`)).toEqual(["b:60", "a:1440", "a:60"]);
    expect(r[0].at).toBeLessThan(r[1].at);
  });
  it("defaults start time to 09:00 and dedupe keys are stable", () => {
    expect(eventStartMs({ date: "2026-06-11" })).toBe(new Date("2026-06-11T09:00:00").getTime());
    const a = reminderSchedule([{ id: "x", title: "X", date: "2026-06-11" }], now);
    const b = reminderSchedule([{ id: "x", title: "X", date: "2026-06-11" }], now);
    expect(a[0].key).toBe(b[0].key);
  });
});

describe("fired keys", () => {
  it("persists and tolerates broken storage", () => {
    const m = new Map<string, string>();
    const store: KeyStore = { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
    expect(hasFired("k", store)).toBe(false);
    markFired("k", store);
    expect(hasFired("k", store)).toBe(true);
    const broken: KeyStore = {
      getItem: () => {
        throw new Error("x");
      },
      setItem: () => {
        throw new Error("x");
      },
    };
    expect(hasFired("k", broken)).toBe(false);
    expect(() => markFired("k", broken)).not.toThrow();
  });
});
