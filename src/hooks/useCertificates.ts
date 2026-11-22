import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { db, unwrap } from "@/lib/db";
import { useAuth } from "@/hooks/useAuth";
import { normalizeCode, isPlausibleCode, type CertificateRow, type VerifyResult } from "@/lib/certificates";

const COLUMNS =
  "id, code, volunteer_name, total_hours, events_count, causes, period_start, period_end, issued_at, revoked_at";

export function useMyCertificates() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-certificates", user?.id],
    enabled: !!user,
    staleTime: 60_000,
    retry: false,
    queryFn: async (): Promise<CertificateRow[]> => {
      const res = await db
        .from<CertificateRow[]>("impact_certificates")
        .select(COLUMNS)
        .eq("user_id", user!.id)
        .order("issued_at", { ascending: false })
        .limit(50);
      return unwrap(res) ?? [];
    },
  });
}

export function useIssueCertificate() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (range: { from?: string | null; to?: string | null }): Promise<CertificateRow> => {
      const res = await db.rpc<CertificateRow>("issue_my_certificate", {
        p_from: range.from ?? null,
        p_to: range.to ?? null,
      });
      return unwrap(res);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-certificates", user?.id] }),
  });
}

export function useVerifyCertificate(code: string | undefined) {
  const normalized = normalizeCode(code);
  return useQuery({
    queryKey: ["verify-certificate", normalized],
    enabled: normalized.length > 0,
    staleTime: 30_000,
    retry: false,
    queryFn: async (): Promise<VerifyResult> => {
      // Skip the network for codes that cannot exist.
      if (!isPlausibleCode(normalized)) return { valid: false };
      const res = await db.rpc<VerifyResult>("verify_certificate", { p_code: normalized });
      return unwrap(res) ?? { valid: false };
    },
  });
}
