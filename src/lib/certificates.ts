export const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const CODE_LENGTH = 12;

export interface CertificateRow {
  id: string;
  code: string;
  volunteer_name: string | null;
  total_hours: number;
  events_count: number;
  causes: string[];
  period_start: string | null;
  period_end: string | null;
  issued_at: string;
  revoked_at: string | null;
}

export interface VerifyResult {
  valid: boolean;
  revoked?: boolean;
  volunteer_name?: string;
  total_hours?: number;
  events_count?: number;
  causes?: string[];
  period_start?: string | null;
  period_end?: string | null;
  issued_at?: string;
}

/** Strip separators/whitespace and uppercase. */
export function normalizeCode(input: string | null | undefined): string {
  return (input ?? "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

/** XXXX-XXXX-XXXX for a 12 char code; otherwise returns the normalized input. */
export function formatCode(input: string | null | undefined): string {
  const c = normalizeCode(input);
  if (c.length !== CODE_LENGTH) return c;
  return `${c.slice(0, 4)}-${c.slice(4, 8)}-${c.slice(8, 12)}`;
}

export function isPlausibleCode(input: string | null | undefined): boolean {
  const c = normalizeCode(input);
  return c.length === CODE_LENGTH && [...c].every((ch) => CODE_ALPHABET.includes(ch));
}

export function buildVerifyUrl(origin: string, code: string): string {
  return `${origin.replace(/\/+$/, "")}/verify/${normalizeCode(code)}`;
}

/** "Asha Kulkarni" -> "Asha K."; single names stay as is. */
export function maskName(fullName: string | null | undefined): string {
  const parts = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Volunteer";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1].charAt(0).toUpperCase()}.`;
}

function fmt(d: string): string {
  const date = new Date(`${d.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return d;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

export function formatPeriod(start: string | null | undefined, end: string | null | undefined): string {
  if (start && end) return `${fmt(start)} – ${fmt(end)}`;
  if (start) return `Since ${fmt(start)}`;
  if (end) return `Until ${fmt(end)}`;
  return "All time";
}
