import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { db, unwrap } from "@/lib/db";
import { useAuth } from "@/hooks/useAuth";
import { parseRegisterResult, type RegisterResult } from "@/lib/waitlist";

export interface OpportunityCapacity {
  opportunity_id: string;
  registered: number;
  waitlisted: number;
  max_volunteers: number | null;
}

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: ["public-opportunities"] });
  void qc.invalidateQueries({ queryKey: ["my-registrations"] });
  void qc.invalidateQueries({ queryKey: ["waitlist"] });
}

export function useRegisterForOpportunity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (opportunityId: string): Promise<RegisterResult> => {
      const data = unwrap(await db.rpc("register_for_opportunity", { p_opportunity_id: opportunityId }));
      return parseRegisterResult(data);
    },
    onSuccess: () => invalidateAll(qc),
  });
}

export function useLeaveWaitlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (opportunityId: string): Promise<boolean> =>
      Boolean(unwrap(await db.rpc<boolean>("leave_waitlist", { p_opportunity_id: opportunityId }))),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useWaitlistPosition(opportunityId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["waitlist", "position", opportunityId, user?.id],
    queryFn: async (): Promise<number | null> => {
      const data = unwrap(await db.rpc<number | null>("waitlist_position", { p_opportunity_id: opportunityId! }));
      return typeof data === "number" ? data : null;
    },
    enabled: !!opportunityId && !!user,
    staleTime: 30_000,
    retry: false,
  });
}

export function useOpportunityCapacity(ids: string[]) {
  const key = [...new Set(ids)].sort();
  return useQuery({
    queryKey: ["waitlist", "capacity", key],
    queryFn: async (): Promise<Record<string, OpportunityCapacity>> => {
      const rows = unwrap(await db.rpc<OpportunityCapacity[]>("get_opportunity_capacity", { p_ids: key })) ?? [];
      return Object.fromEntries(
        rows.map((r) => [
          r.opportunity_id,
          {
            opportunity_id: r.opportunity_id,
            registered: Number(r.registered),
            waitlisted: Number(r.waitlisted),
            max_volunteers: r.max_volunteers,
          },
        ]),
      );
    },
    enabled: key.length > 0,
    staleTime: 30_000,
    retry: false,
  });
}
