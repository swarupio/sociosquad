/** Pure helpers for QR / code check-in. */

// Crockford base32 (32 symbols, no I, L, O, U). Must match the SQL generator.
export const CODE_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
export const CODE_LENGTH = 8;

const AMBIGUOUS: Record<string, string> = { O: "0", I: "1", L: "1" };

/** Strip separators/whitespace, uppercase, and map ambiguous characters (O->0, I/L->1). */
export function normalizeCode(input: string): string {
  return (input ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .split("")
    .map((c) => AMBIGUOUS[c] ?? c)
    .join("");
}

export function isValidCode(code: string): boolean {
  if (code.length !== CODE_LENGTH) return false;
  for (const c of code) if (!CODE_ALPHABET.includes(c)) return false;
  return true;
}

/** Normalized code -> XXXX-XXXX (partial codes are grouped too). */
export function formatCode(code: string): string {
  const n = normalizeCode(code);
  return n.length > 4 ? `${n.slice(0, 4)}-${n.slice(4)}` : n;
}

export function buildCheckinUrl(origin: string, code: string): string {
  return `${origin.replace(/\/+$/, "")}/check-in?code=${encodeURIComponent(normalizeCode(code))}`;
}

/** Accepts a raw code or a full check-in URL. Returns the normalized code or null. */
export function parseCheckinInput(text: string): string | null {
  const raw = (text ?? "").trim();
  if (!raw) return null;
  let candidate = raw;
  if (raw.includes("://") || raw.includes("check-in") || raw.includes("?")) {
    try {
      const url = new URL(raw.includes("://") ? raw : `https://x.invalid/${raw.replace(/^\/+/, "")}`);
      const param = url.searchParams.get("code");
      if (!param) return null;
      candidate = param;
    } catch {
      return null;
    }
  }
  const code = normalizeCode(candidate);
  return isValidCode(code) ? code : null;
}

/** Seconds remaining until an ISO timestamp (never negative). */
export function secondsUntil(iso: string, now: number = Date.now()): number {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.max(0, Math.floor((t - now) / 1000));
}

export function formatCountdown(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}
