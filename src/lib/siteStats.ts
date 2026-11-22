/**
 * Single source of truth for marketing figures shown on the landing page.
 * These numbers are ILLUSTRATIVE (not computed from live data). Replace with
 * real aggregates once an analytics RPC exists, then set `illustrative` to false.
 */
export const siteStats = {
  illustrative: true,
  volunteers: { value: 15, suffix: "K+" },
  countries: { value: 100, suffix: "+" },
  ngoPartners: { value: 600, suffix: "+" },
  hoursVolunteered: { value: 2400000, suffix: "+" },
  satisfactionRate: { value: 98, suffix: "%" },
  causeCounts: {
    Environment: "2.4k",
    Education: "1.8k",
    Healthcare: "1.2k",
    Housing: "890",
    "Arts & Culture": "650",
    Humanitarian: "3.1k",
  } as Record<string, string>,
} as const;

export const ILLUSTRATIVE_FOOTNOTE = "Figures shown are illustrative.";
