import { useMutation, useQueryClient } from "@tanstack/react-query";
import { db, unwrap, isMissingMigration } from "@/lib/db";
import { validateRecurrence, type RecurrenceRule } from "@/lib/recurrence";
import { useToast } from "@/hooks/use-toast";

export interface SeriesTemplate {
  title: string;
  description?: string;
  category?: string;
  skills_needed?: string[];
  start_time?: string;
  end_time?: string;
  location?: string;
  city?: string;
  max_volunteers?: number;
  time_commitment?: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface CreateSeriesInput {
  template: SeriesTemplate;
  rule: RecurrenceRule;
  startsOn: string;
  occurrences: number;
}

const NOT_ENABLED = "Recurring opportunities are not enabled yet.";

export function useCreateSeries(orgId: string | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateSeriesInput): Promise<string[]> => {
      if (!orgId) throw new Error("No organization selected");
      const invalid = validateRecurrence(input);
      if (invalid) throw new Error(invalid);
      const res = await db.rpc<string[]>("create_opportunity_series", {
        p_org_id: orgId,
        p_template: input.template,
        p_rule: input.rule,
        p_starts_on: input.startsOn,
        p_occurrences: input.occurrences,
      });
      return unwrap(res) ?? [];
    },
    onSuccess: (ids) => {
      toast({ title: `Series created: ${ids.length} opportunities posted` });
      queryClient.invalidateQueries({ queryKey: ["org-opportunities", orgId] });
      queryClient.invalidateQueries({ queryKey: ["public-opportunities"] });
    },
    onError: (e: Error) => {
      toast(
        isMissingMigration(e)
          ? { title: "Feature not enabled yet", description: NOT_ENABLED }
          : { title: "Could not create series", description: e.message, variant: "destructive" },
      );
    },
  });
}

export interface CancelSeriesInput {
  seriesId: string;
  /** YYYY-MM-DD; defaults to today on the server. */
  from?: string;
  orgId?: string;
}

export interface CancelSeriesResult {
  deleted: number;
  cancelled: number;
}

export function useCancelSeries() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ seriesId, from }: CancelSeriesInput): Promise<CancelSeriesResult> => {
      const args: Record<string, unknown> = { p_series_id: seriesId };
      if (from) args.p_from = from;
      const res = await db.rpc<CancelSeriesResult>("cancel_opportunity_series", args);
      return unwrap(res) ?? { deleted: 0, cancelled: 0 };
    },
    onSuccess: (r) => {
      toast({
        title: "Series cancelled",
        description: `${r.deleted} removed, ${r.cancelled} cancelled (had registrations).`,
      });
      queryClient.invalidateQueries({ queryKey: ["org-opportunities"] });
      queryClient.invalidateQueries({ queryKey: ["public-opportunities"] });
    },
    onError: (e: Error) => {
      toast(
        isMissingMigration(e)
          ? { title: "Feature not enabled yet", description: NOT_ENABLED }
          : { title: "Could not cancel series", description: e.message, variant: "destructive" },
      );
    },
  });
}
