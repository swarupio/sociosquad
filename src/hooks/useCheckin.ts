import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { db, isMissingMigration, unwrap } from "@/lib/db";
import { normalizeCode } from "@/lib/checkin";

export type CheckinErrorKind =
  | "not_enabled"
  | "invalid_code"
  | "not_registered"
  | "wrong_day"
  | "rate_limited"
  | "not_allowed"
  | "unknown";

export class CheckinError extends Error {
  kind: CheckinErrorKind;
  constructor(kind: CheckinErrorKind, message: string) {
    super(message);
    this.name = "CheckinError";
    this.kind = kind;
  }
}

export function toCheckinError(e: unknown): CheckinError {
  if (e instanceof CheckinError) return e;
  const err = e as { code?: string; message?: string } | null;
  const msg = err?.message ?? "Something went wrong";
  if (isMissingMigration(e)) return new CheckinError("not_enabled", "Check-in is not enabled yet.");
  switch (err?.code) {
    case "P0003":
      return new CheckinError("not_registered", msg);
    case "P0001":
      return new CheckinError("wrong_day", msg);
    case "54000":
      return new CheckinError("rate_limited", msg);
    case "42501":
      return new CheckinError("not_allowed", "You do not manage this opportunity.");
    default:
      return new CheckinError("unknown", msg);
  }
}

export interface CheckinCode {
  code: string;
  expires_at: string;
}

export function useOrgCheckinCode(opportunityId: string | undefined) {
  const qc = useQueryClient();
  const key = ["checkin-code", opportunityId];

  const query = useQuery({
    queryKey: key,
    enabled: !!opportunityId,
    retry: false,
    queryFn: async (): Promise<CheckinCode | null> => {
      try {
        const res = await db
          .from<CheckinCode>("checkin_codes")
          .select("code, expires_at")
          .eq("opportunity_id", opportunityId!)
          .maybeSingle();
        return unwrap(res) ?? null;
      } catch (e) {
        throw toCheckinError(e);
      }
    },
  });

  const rotate = useMutation({
    mutationFn: async (ttlMinutes: number = 120): Promise<CheckinCode> => {
      try {
        const res = await db.rpc<CheckinCode[] | CheckinCode>("org_rotate_checkin_code", {
          p_opportunity_id: opportunityId!,
          p_ttl_minutes: ttlMinutes,
        });
        const data = unwrap(res);
        const row = Array.isArray(data) ? data[0] : data;
        if (!row) throw new CheckinError("unknown", "No code returned");
        return row;
      } catch (e) {
        throw toCheckinError(e);
      }
    },
    onSuccess: (row) => qc.setQueryData(key, row),
  });

  const notEnabled = (query.error as CheckinError | null)?.kind === "not_enabled";
  return { ...query, rotate, notEnabled };
}

export interface CheckinResult {
  ok: boolean;
  opportunity_id: string;
  title: string;
  already: boolean;
}

export function useVolunteerCheckin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rawCode: string): Promise<CheckinResult> => {
      try {
        const res = await db.rpc<CheckinResult & { error?: string }>("volunteer_check_in", {
          p_code: normalizeCode(rawCode),
        });
        const data = unwrap(res);
        if (!data || data.ok !== true) {
          throw new CheckinError("invalid_code", "That code is invalid or has expired.");
        }
        return data;
      } catch (e) {
        throw toCheckinError(e);
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["my-registrations"] });
    },
  });
}
