export type CapacityState = "open" | "filling" | "full" | "waitlist";

export interface RegisterResult {
  status: "registered" | "waitlisted";
  position: number | null;
}

/** Fraction (0-1) of capacity used; 0 when there is no limit. */
export function fillRatio(registered: number, max: number | null | undefined): number {
  if (!max || max <= 0) return 0;
  return Math.min(1, Math.max(0, registered / max));
}

export function capacityState(
  registered: number,
  max: number | null | undefined,
  waitlisted = 0,
): CapacityState {
  if (!max || max <= 0) return "open";
  if (registered >= max) return waitlisted > 0 ? "waitlist" : "full";
  return registered / max >= 0.8 ? "filling" : "open";
}

export function spotsLabel(
  registered: number,
  max: number | null | undefined,
  waitlisted = 0,
): string {
  if (!max || max <= 0) return `${registered} registered`;
  const left = max - registered;
  if (left <= 0) {
    return waitlisted > 0 ? `Full - ${waitlisted} on waitlist` : "Full";
  }
  return left === 1 ? "1 spot left" : `${left} spots left`;
}

function safeParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

export function parseRegisterResult(raw: unknown): RegisterResult {
  const obj = (typeof raw === "string" ? safeParse(raw) : raw) as
    | { status?: unknown; position?: unknown }
    | null
    | undefined;
  const status =
    obj?.status === "waitlisted" ? "waitlisted" : obj?.status === "registered" ? "registered" : null;
  if (!status) throw new Error("Unexpected response from registration");
  const pos = typeof obj?.position === "number" ? obj.position : null;
  return { status, position: status === "waitlisted" ? pos : null };
}
