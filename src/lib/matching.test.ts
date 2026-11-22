import { describe, expect, it } from "vitest";
import {
  dayPartOf,
  hasPreferences,
  matchTier,
  normalizeSkill,
  rankOpportunities,
  scoreOpportunity,
  type MatchPreferences,
} from "./matching";

const empty: MatchPreferences = {
  skills: [],
  causes: [],
  max_distance_km: null,
  availability: [],
  home_latitude: null,
  home_longitude: null,
};
// Monday 2026-06-01 09:00 local
const now = new Date(2026, 5, 1, 9, 0);

describe("normalizeSkill", () => {
  it("lowercases, trims and maps synonyms", () => {
    expect(normalizeSkill("  Teacher ")).toBe("teaching");
    expect(normalizeSkill("First-Aid")).toBe("first aid");
    expect(normalizeSkill("Rust")).toBe("rust");
  });
});

describe("hasPreferences / empty prefs", () => {
  it("is false for empty or missing", () => {
    expect(hasPreferences(empty)).toBe(false);
    expect(hasPreferences(null)).toBe(false);
  });
  it("returns null score", () => {
    expect(scoreOpportunity(empty, { category: "Education" }, now).score).toBeNull();
    expect(scoreOpportunity(null, { category: "Education" }, now).score).toBeNull();
  });
  it("returns null when prefs exist but nothing is comparable", () => {
    expect(scoreOpportunity({ ...empty, skills: ["Cooking"] }, { category: "Education" }, now).score).toBeNull();
  });
});

describe("skills", () => {
  const prefs = { ...empty, skills: ["teacher", "Cooking"] };
  it("scores full overlap with synonyms case-insensitively", () => {
    const r = scoreOpportunity(prefs, { skills_needed: ["Teaching", "COOKING"] }, now);
    expect(r.score).toBe(100);
    expect(r.reasons[0]).toContain("teaching");
  });
  it("scores partial overlap", () => {
    expect(scoreOpportunity(prefs, { skills_needed: ["teaching", "driving"] }, now).score).toBe(50);
  });
  it("scores zero with no overlap", () => {
    expect(scoreOpportunity(prefs, { skills_needed: ["driving"] }, now).score).toBe(0);
  });
});

describe("cause", () => {
  it("matches category case-insensitively", () => {
    const p = { ...empty, causes: ["Environment"] };
    expect(scoreOpportunity(p, { category: "environment" }, now).score).toBe(100);
    expect(scoreOpportunity(p, { category: "Education" }, now).score).toBe(0);
  });
});

describe("distance", () => {
  const home = { ...empty, home_latitude: 19.076, home_longitude: 72.8777, max_distance_km: 20 };
  it("is high when close, lower when far, zero when very far", () => {
    const near = scoreOpportunity(home, { latitude: 19.08, longitude: 72.88 }, now).score as number;
    const mid = scoreOpportunity(home, { latitude: 19.2, longitude: 72.95 }, now).score as number;
    const far = scoreOpportunity(home, { latitude: 28.61, longitude: 77.2 }, now).score as number;
    expect(near).toBeGreaterThan(90);
    expect(mid).toBeLessThan(near);
    expect(far).toBe(0);
  });
  it("ignores invalid coordinates", () => {
    expect(scoreOpportunity(home, { latitude: 999, longitude: 0 }, now).score).toBeNull();
  });
});

describe("availability", () => {
  it("dayPartOf buckets hours", () => {
    expect(dayPartOf("09:00")).toBe("morning");
    expect(dayPartOf("12:00:00")).toBe("afternoon");
    expect(dayPartOf("17:30")).toBe("evening");
    expect(dayPartOf(null)).toBeNull();
  });
  it("matches weekend morning (2026-06-06 is Saturday)", () => {
    const p = { ...empty, availability: ["weekend-morning"] };
    const hit = scoreOpportunity(p, { date: "2026-06-06", start_time: "09:00" }, now);
    expect(hit.score).toBe(100);
    expect(hit.reasons.join()).toContain("weekend morning");
  });
  it("partial credit for right day type, wrong part", () => {
    const p = { ...empty, availability: ["weekend-morning"] };
    expect(scoreOpportunity(p, { date: "2026-06-06", start_time: "18:00" }, now).score).toBeGreaterThan(0);
    expect(scoreOpportunity(p, { date: "2026-06-03", start_time: "18:00" }, now).score).toBe(0);
  });
  it("without a start time only the day type is checked", () => {
    const p = { ...empty, availability: ["weekday-evening"] };
    expect(scoreOpportunity(p, { date: "2026-06-03" }, now).score).toBe(100);
  });
});

describe("combination, urgency and past events", () => {
  const prefs: MatchPreferences = { ...empty, skills: ["teaching"], causes: ["Education"] };
  it("combines weights", () => {
    const r = scoreOpportunity(prefs, { skills_needed: ["teaching"], category: "Health" }, now);
    // skills 40*1 + cause 25*0 over 65 => ~62
    expect(r.score).toBe(62);
  });
  it("adds urgency bonus for imminent, nearly full events, capped at 100", () => {
    const base = { skills_needed: ["teaching"], category: "Health", date: "2026-06-02", start_time: "10:00" };
    const normal = scoreOpportunity(prefs, base, now).score as number;
    const urgent = scoreOpportunity(prefs, { ...base, max_volunteers: 10, registered_count: 9 }, now);
    expect(urgent.score as number).toBeGreaterThan(normal);
    expect(urgent.reasons).toContain("Only a few spots left");
    const perfect = scoreOpportunity(prefs, { ...base, category: "Education", max_volunteers: 10, registered_count: 9 }, now);
    expect(perfect.score).toBe(100);
  });
  it("gives no urgency for full events", () => {
    const r = scoreOpportunity(prefs, { skills_needed: ["teaching"], date: "2026-06-02", max_volunteers: 5, registered_count: 5 }, now);
    expect(r.breakdown.urgency).toBe(0);
  });
  it("scores past opportunities zero", () => {
    const r = scoreOpportunity(prefs, { skills_needed: ["teaching"], date: "2026-05-01" }, now);
    expect(r.score).toBe(0);
    expect(r.reasons).toEqual(["Already happened"]);
  });
});

describe("rankOpportunities", () => {
  const prefs: MatchPreferences = { ...empty, causes: ["Education"] };
  const opps = [
    { id: "a", category: "Health" },
    { id: "b", category: "Education" },
    { id: "c" },
    { id: "d", category: "Health" },
  ];
  it("sorts by score desc, nulls last, stable ties", () => {
    const ids = rankOpportunities(prefs, opps, { now }).map((r) => r.opportunity.id);
    expect(ids).toEqual(["b", "a", "d", "c"]);
  });
  it("supports minScore and limit", () => {
    expect(rankOpportunities(prefs, opps, { now, minScore: 1 }).map((r) => r.opportunity.id)).toEqual(["b"]);
    expect(rankOpportunities(prefs, opps, { now, limit: 2 })).toHaveLength(2);
  });
  it("keeps order when prefs are empty", () => {
    expect(rankOpportunities(empty, opps, { now }).map((r) => r.opportunity.id)).toEqual(["a", "b", "c", "d"]);
  });
});

describe("matchTier", () => {
  it("buckets scores", () => {
    expect(matchTier(90)).toBe("high");
    expect(matchTier(50)).toBe("medium");
    expect(matchTier(10)).toBe("low");
  });
});
