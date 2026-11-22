import { useQuery } from "@tanstack/react-query";
import { db, isMissingMigration, unwrap } from "@/lib/db";
import type { DateRange, OpportunityRow, OrgSummary, WeekPoint } from "@/lib/orgAnalytics";

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export function useOrgAnalytics(orgId: string | undefined, range: DateRange) {
  const args = { p_org_id: orgId, p_from: range.from, p_to: range.to };
  const enabled = !!orgId;
  const opts = {
    enabled,
    staleTime: 60_000,
    retry: (count: number, err: unknown) => !isMissingMigration(err) && count < 1,
  };

  const summary = useQuery({
    queryKey: ["org-analytics", "summary", orgId, range.from, range.to],
    queryFn: async (): Promise<OrgSummary> => {
      const raw = unwrap(await db.rpc<Partial<Record<keyof OrgSummary, unknown>>>("org_analytics_summary", args)) ?? {};
      return {
        opportunities: num(raw.opportunities),
        registrations: num(raw.registrations),
        attended: num(raw.attended),
        no_show_rate: num(raw.no_show_rate),
        verified_hours: num(raw.verified_hours),
        unique_volunteers: num(raw.unique_volunteers),
        repeat_volunteers: num(raw.repeat_volunteers),
        avg_fill_rate: num(raw.avg_fill_rate),
      };
    },
    ...opts,
  });

  const timeseries = useQuery({
    queryKey: ["org-analytics", "timeseries", orgId, range.from, range.to],
    queryFn: async (): Promise<WeekPoint[]> => {
      const rows = unwrap(await db.rpc<WeekPoint[]>("org_analytics_timeseries", args)) ?? [];
      return rows.map((r) => ({
        week_start: String(r.week_start).slice(0, 10),
        registrations: num(r.registrations),
        attended: num(r.attended),
        hours: num(r.hours),
      }));
    },
    ...opts,
  });

  const byOpportunity = useQuery({
    queryKey: ["org-analytics", "by-opportunity", orgId, range.from, range.to],
    queryFn: async (): Promise<OpportunityRow[]> => {
      const rows = unwrap(await db.rpc<OpportunityRow[]>("org_analytics_by_opportunity", args)) ?? [];
      return rows.map((r) => ({
        opportunity_id: String(r.opportunity_id),
        title: r.title,
        date: String(r.date).slice(0, 10),
        category: r.category ?? null,
        max_volunteers: r.max_volunteers == null ? null : num(r.max_volunteers),
        registered: num(r.registered),
        attended: num(r.attended),
        hours: num(r.hours),
        fill_rate: num(r.fill_rate),
      }));
    },
    ...opts,
  });

  const error = summary.error ?? timeseries.error ?? byOpportunity.error;
  return {
    summary,
    timeseries,
    byOpportunity,
    isLoading: summary.isLoading || timeseries.isLoading || byOpportunity.isLoading,
    error,
    notEnabled: !!error && isMissingMigration(error),
  };
}
