export const MAX_COMMENT_LENGTH = 1000;
export const MIN_ENDORSEMENT_LENGTH = 10;
export const MAX_ENDORSEMENT_LENGTH = 600;

/** Trim and collapse whitespace (keeps single newlines out). Output is plain text; never render as HTML. */
export function sanitizeComment(input: string | null | undefined): string {
  return (input ?? "").replace(/\s+/g, " ").trim();
}

export interface ReviewInput {
  rating: number | null | undefined;
  comment?: string | null;
}

export interface ReviewValidation {
  valid: boolean;
  errors: { rating?: string; comment?: string };
}

export function validateReview({ rating, comment }: ReviewInput): ReviewValidation {
  const errors: ReviewValidation["errors"] = {};
  if (typeof rating !== "number" || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    errors.rating = "Please choose a rating from 1 to 5.";
  }
  if (sanitizeComment(comment).length > MAX_COMMENT_LENGTH) {
    errors.comment = `Comment must be ${MAX_COMMENT_LENGTH} characters or fewer.`;
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateEndorsement(text: string | null | undefined): string | null {
  const len = sanitizeComment(text).length;
  if (len < MIN_ENDORSEMENT_LENGTH) return `Write at least ${MIN_ENDORSEMENT_LENGTH} characters.`;
  if (len > MAX_ENDORSEMENT_LENGTH) return `Keep it under ${MAX_ENDORSEMENT_LENGTH} characters.`;
  return null;
}

export function averageRating(ratings: number[]): number {
  const valid = ratings.filter((r) => Number.isFinite(r) && r >= 1 && r <= 5);
  if (valid.length === 0) return 0;
  const avg = valid.reduce((a, b) => a + b, 0) / valid.length;
  return Math.round(avg * 100) / 100;
}

/** Returns counts keyed 1..5. */
export function ratingDistribution(ratings: number[]): Record<1 | 2 | 3 | 4 | 5, number> {
  const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<1 | 2 | 3 | 4 | 5, number>;
  for (const r of ratings) {
    if (Number.isInteger(r) && r >= 1 && r <= 5) dist[r as 1 | 2 | 3 | 4 | 5] += 1;
  }
  return dist;
}

export function formatRating(avg: number | null | undefined, count?: number): string {
  if (!avg || count === 0) return "No ratings yet";
  const base = avg.toFixed(1);
  return count === undefined ? base : `${base} (${count} ${count === 1 ? "review" : "reviews"})`;
}

export function firstName(fullName: string | null | undefined): string {
  const first = sanitizeComment(fullName).split(" ")[0];
  return first || "Volunteer";
}

export function initials(fullName: string | null | undefined): string {
  const name = sanitizeComment(fullName);
  if (!name) return "V";
  const parts = name.split(" ");
  const a = parts[0]?.[0] ?? "";
  const b = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (a + b).toUpperCase() || "V";
}
