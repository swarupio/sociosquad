import { describe, expect, it } from "vitest";
import {
  averageRating,
  firstName,
  formatRating,
  initials,
  ratingDistribution,
  sanitizeComment,
  validateEndorsement,
  validateReview,
} from "./feedback";

describe("sanitizeComment", () => {
  it("trims and collapses whitespace", () => {
    expect(sanitizeComment("  hi \n\n  there\t ")).toBe("hi there");
    expect(sanitizeComment(null)).toBe("");
  });
});

describe("validateReview", () => {
  it("accepts valid input", () => {
    expect(validateReview({ rating: 4, comment: "Great" }).valid).toBe(true);
    expect(validateReview({ rating: 5 }).valid).toBe(true);
  });
  it("rejects bad rating", () => {
    expect(validateReview({ rating: 0 }).errors.rating).toBeDefined();
    expect(validateReview({ rating: 6 }).valid).toBe(false);
    expect(validateReview({ rating: 3.5 }).valid).toBe(false);
    expect(validateReview({ rating: null }).valid).toBe(false);
  });
  it("rejects long comment", () => {
    expect(validateReview({ rating: 3, comment: "a".repeat(1001) }).errors.comment).toBeDefined();
    expect(validateReview({ rating: 3, comment: "a".repeat(1000) }).valid).toBe(true);
  });
});

describe("validateEndorsement", () => {
  it("enforces length bounds", () => {
    expect(validateEndorsement("short")).not.toBeNull();
    expect(validateEndorsement("a good volunteer")).toBeNull();
    expect(validateEndorsement("a".repeat(601))).not.toBeNull();
  });
});

describe("rating math", () => {
  it("averages", () => {
    expect(averageRating([])).toBe(0);
    expect(averageRating([5, 4])).toBe(4.5);
    expect(averageRating([5, 4, 4])).toBe(4.33);
  });
  it("distributes", () => {
    expect(ratingDistribution([5, 5, 1, 9, 2.5])).toEqual({ 1: 1, 2: 0, 3: 0, 4: 0, 5: 2 });
  });
  it("formats", () => {
    expect(formatRating(0, 0)).toBe("No ratings yet");
    expect(formatRating(4.25, 1)).toBe("4.3 (1 review)");
    expect(formatRating(4, 3)).toBe("4.0 (3 reviews)");
    expect(formatRating(4)).toBe("4.0");
  });
});

describe("names", () => {
  it("first name and initials with fallback", () => {
    expect(firstName("Asha Patil")).toBe("Asha");
    expect(firstName("")).toBe("Volunteer");
    expect(initials("Asha Patil")).toBe("AP");
    expect(initials(null)).toBe("V");
  });
});
