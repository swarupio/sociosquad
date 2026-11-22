import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { db, isMissingMigration, unwrap } from "@/lib/db";
import { useAuth } from "@/hooks/useAuth";
import { sanitizeComment, validateEndorsement, validateReview } from "@/lib/feedback";

export interface Review {
  id: string;
  opportunity_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
  reviewer_name: string | null;
}

export interface OpportunityRating {
  avg: number;
  count: number;
}

export interface Endorsement {
  id: string;
  volunteer_id: string;
  org_id: string;
  opportunity_id: string | null;
  text: string;
  created_at: string;
  org_name: string | null;
}

const REVIEW_COLS = "id, opportunity_id, user_id, rating, comment, created_at, updated_at";
const ENDORSEMENT_COLS = "id, volunteer_id, org_id, opportunity_id, text, created_at";

const noRetryOnMissing = (count: number, err: unknown) => !isMissingMigration(err) && count < 2;

export function useOpportunityReviews(opportunityId: string | undefined) {
  return useQuery({
    queryKey: ["feedback", "reviews", opportunityId],
    enabled: !!opportunityId,
    staleTime: 30_000,
    retry: noRetryOnMissing,
    queryFn: async (): Promise<Review[]> => {
      const rows = unwrap(
        await db
          .from<Omit<Review, "reviewer_name">[]>("opportunity_reviews")
          .select(REVIEW_COLS)
          .eq("opportunity_id", opportunityId!)
          .order("created_at", { ascending: false })
          .limit(100),
      ) ?? [];
      if (rows.length === 0) return [];
      const userIds = [...new Set(rows.map((r) => r.user_id))];
      const profRes = await db
        .from<{ user_id: string; full_name: string | null }[]>("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);
      const names = new Map((profRes.error ? [] : profRes.data ?? []).map((p) => [p.user_id, p.full_name]));
      return rows.map((r) => ({ ...r, reviewer_name: names.get(r.user_id) ?? null }));
    },
  });
}

export function useMyReview(opportunityId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["feedback", "my-review", opportunityId, user?.id],
    enabled: !!opportunityId && !!user?.id,
    staleTime: 30_000,
    retry: noRetryOnMissing,
    queryFn: async () =>
      unwrap(
        await db
          .from<Omit<Review, "reviewer_name"> | null>("opportunity_reviews")
          .select(REVIEW_COLS)
          .eq("opportunity_id", opportunityId!)
          .eq("user_id", user!.id)
          .maybeSingle(),
      ) ?? null,
  });
}

export function useOpportunityRating(opportunityId: string | undefined) {
  return useQuery({
    queryKey: ["feedback", "rating", opportunityId],
    enabled: !!opportunityId,
    staleTime: 60_000,
    retry: noRetryOnMissing,
    queryFn: async (): Promise<OpportunityRating> => {
      const data = unwrap(
        await db.rpc<{ avg: number | string; count: number | string }[]>("get_opportunity_rating", {
          p_opportunity_id: opportunityId!,
        }),
      );
      const row = Array.isArray(data) ? data[0] : data;
      return { avg: Number(row?.avg ?? 0), count: Number(row?.count ?? 0) };
    },
  });
}

export function useSubmitReview() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { opportunityId: string; rating: number; comment?: string }) => {
      if (!user) throw new Error("Please sign in to leave a review.");
      const check = validateReview({ rating: input.rating, comment: input.comment });
      if (!check.valid) throw new Error(check.errors.rating ?? check.errors.comment ?? "Invalid review.");
      const comment = sanitizeComment(input.comment) || null;
      unwrap(
        await db
          .from("opportunity_reviews")
          .upsert(
            { opportunity_id: input.opportunityId, user_id: user.id, rating: input.rating, comment },
            { onConflict: "opportunity_id,user_id" },
          ),
      );
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["feedback", "reviews", v.opportunityId] });
      qc.invalidateQueries({ queryKey: ["feedback", "my-review", v.opportunityId] });
      qc.invalidateQueries({ queryKey: ["feedback", "rating", v.opportunityId] });
    },
  });
}

/** Endorsements received by a volunteer (defaults to the signed-in user). */
export function useMyEndorsements(userId?: string) {
  const { user } = useAuth();
  const target = userId ?? user?.id;
  return useQuery({
    queryKey: ["feedback", "endorsements", target],
    enabled: !!target,
    staleTime: 60_000,
    retry: noRetryOnMissing,
    queryFn: async (): Promise<Endorsement[]> => {
      const rows =
        unwrap(
          await db
            .from<Omit<Endorsement, "org_name">[]>("volunteer_endorsements")
            .select(ENDORSEMENT_COLS)
            .eq("volunteer_id", target!)
            .order("created_at", { ascending: false })
            .limit(50),
        ) ?? [];
      if (rows.length === 0) return [];
      const orgIds = [...new Set(rows.map((r) => r.org_id))];
      const orgRes = await db
        .from<{ id: string; name: string }[]>("organizations")
        .select("id, name")
        .in("id", orgIds);
      const names = new Map((orgRes.error ? [] : orgRes.data ?? []).map((o) => [o.id, o.name]));
      return rows.map((r) => ({ ...r, org_name: names.get(r.org_id) ?? null }));
    },
  });
}

/** Org side: endorse a volunteer who attended one of the org's opportunities. */
export function useEndorseVolunteer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { volunteerId: string; orgId: string; opportunityId?: string | null; text: string }) => {
      const problem = validateEndorsement(input.text);
      if (problem) throw new Error(problem);
      unwrap(
        await db.from("volunteer_endorsements").insert({
          volunteer_id: input.volunteerId,
          org_id: input.orgId,
          opportunity_id: input.opportunityId ?? null,
          text: sanitizeComment(input.text),
        }),
      );
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["feedback", "endorsements", v.volunteerId] });
    },
  });
}
