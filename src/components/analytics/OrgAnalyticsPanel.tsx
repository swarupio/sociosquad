import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useOrgAnalytics } from "@/hooks/useOrgAnalytics";
import {
  fillMissingWeeks,
  formatHours,
  formatPct,
  rangeForDays,
  summarizeTrend,
  type OpportunityRow,
  type WeekPoint,
} from "@/lib/orgAnalytics";
import { ExportButtons } from "./ExportButtons";

interface Props {
  orgId: string;
  orgName: string;
}

const RANGES = [
  { days: 30, label: "Last 30 days" },
  { days: 90, label: "Last 90 days" },
  { days: 365, label: "Last 365 days" },
];

type SortKey = "title" | "date" | "registered" | "attended" | "hours" | "fill_rate";

function WeeklyChart({ data }: { data: WeekPoint[] }) {
  const max = Math.max(1, ...data.map((d) => d.registrations));
  const barW = 100 / Math.max(data.length, 1);
  const summary = `Weekly registrations versus attended, ${data.length} weeks`;
  return (
    <div>
      <svg
        role="img"
        aria-label={summary}
        viewBox="0 0 100 40"
        preserveAspectRatio="none"
        className="h-48 w-full"
      >
        {data.map((d, i) => {
          const h = (d.registrations / max) * 38;
          const a = (d.attended / max) * 38;
          const x = i * barW;
          return (
            <g key={d.week_start}>
              <rect x={x + barW * 0.1} y={39 - h} width={barW * 0.8} height={h} className="fill-primary/30">
                <title>{`${d.week_start}: ${d.registrations} registered, ${d.attended} attended`}</title>
              </rect>
              <rect x={x + barW * 0.25} y={39 - a} width={barW * 0.5} height={a} className="fill-primary" />
            </g>
          );
        })}
        <line x1="0" y1="39" x2="100" y2="39" className="stroke-border" strokeWidth="0.3" />
      </svg>
      <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-sm bg-primary/30" aria-hidden="true" /> Registered
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-sm bg-primary" aria-hidden="true" /> Attended
        </span>
        <span className="ml-auto">Peak: {max}/week</span>
      </div>
      <table className="sr-only">
        <caption>Weekly registrations and attendance</caption>
        <thead>
          <tr>
            <th scope="col">Week starting</th>
            <th scope="col">Registered</th>
            <th scope="col">Attended</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.week_start}>
              <th scope="row">{d.week_start}</th>
              <td>{d.registrations}</td>
              <td>{d.attended}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="glass-card">
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

export function OrgAnalyticsPanel({ orgId, orgName }: Props) {
  const [days, setDays] = useState(90);
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "date", dir: "desc" });
  const range = useMemo(() => rangeForDays(days), [days]);
  const { summary, timeseries, byOpportunity, isLoading, error, notEnabled } = useOrgAnalytics(orgId, range);

  const weeks = useMemo(() => fillMissingWeeks(timeseries.data ?? [], range), [timeseries.data, range]);
  const trend = useMemo(() => summarizeTrend(weeks.map((w) => w.registrations)), [weeks]);

  const rows = useMemo(() => {
    const list: OpportunityRow[] = [...(byOpportunity.data ?? [])];
    const m = sort.dir === "asc" ? 1 : -1;
    list.sort((a, b) => {
      const av = a[sort.key] ?? "";
      const bv = b[sort.key] ?? "";
      return (av < bv ? -1 : av > bv ? 1 : 0) * m;
    });
    return list;
  }, [byOpportunity.data, sort]);

  const toggleSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" }));

  const header = (key: SortKey, label: string, align = "text-right") => {
    const active = sort.key === key;
    const Icon = !active ? ArrowUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;
    return (
      <th
        scope="col"
        className={`px-3 py-2 font-medium ${align}`}
        aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
      >
        <button type="button" onClick={() => toggleSort(key)} className="inline-flex items-center gap-1 hover:text-foreground">
          {label}
          <Icon className="h-3 w-3" aria-hidden="true" />
        </button>
      </th>
    );
  };

  if (notEnabled) {
    return (
      <Card className="glass-card">
        <CardContent className="p-6 text-sm text-muted-foreground">
          Analytics are not enabled yet. Please check back soon.
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="glass-card" role="alert">
        <CardContent className="space-y-3 p-6 text-sm">
          <p className="text-destructive">Could not load analytics.</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void summary.refetch();
              void timeseries.refetch();
              void byOpportunity.refetch();
            }}
          >
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  const s = summary.data;
  const trendText =
    trend.changePct === null
      ? undefined
      : `${trend.changePct > 0 ? "+" : ""}${trend.changePct}% vs first half`;

  return (
    <section className="space-y-4" aria-label="Organization analytics">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <label htmlFor="oa-range" className="text-sm text-muted-foreground">
            Period
          </label>
          <select
            id="oa-range"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground"
          >
            {RANGES.map((r) => (
              <option key={r.days} value={r.days}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <ExportButtons rows={rows} summary={s} orgName={orgName} range={range} />
      </div>

      {isLoading || !s ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4" aria-busy="true">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Kpi label="Opportunities" value={String(s.opportunities)} />
          <Kpi label="Registrations" value={String(s.registrations)} hint={trendText} />
          <Kpi label="Attended" value={String(s.attended)} />
          <Kpi label="No-show rate" value={formatPct(s.no_show_rate)} />
          <Kpi label="Verified hours" value={formatHours(s.verified_hours)} />
          <Kpi label="Unique volunteers" value={String(s.unique_volunteers)} />
          <Kpi label="Returning volunteers" value={String(s.repeat_volunteers)} />
          <Kpi label="Avg. fill rate" value={formatPct(s.avg_fill_rate)} />
        </div>
      )}

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base">Weekly registrations vs attended</CardTitle>
        </CardHeader>
        <CardContent>
          {timeseries.isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : (timeseries.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity in this period.</p>
          ) : (
            <WeeklyChart data={weeks} />
          )}
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base">By opportunity</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {byOpportunity.isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No opportunities in this period.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-muted-foreground">
                <tr>
                  {header("title", "Opportunity", "text-left")}
                  {header("date", "Date", "text-left")}
                  {header("registered", "Registered")}
                  {header("attended", "Attended")}
                  {header("hours", "Hours")}
                  {header("fill_rate", "Fill rate")}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.opportunity_id} className="border-t border-border">
                    <th scope="row" className="px-3 py-2 text-left font-medium">
                      {r.title}
                    </th>
                    <td className="px-3 py-2">{r.date}</td>
                    <td className="px-3 py-2 text-right">
                      {r.registered}
                      {r.max_volunteers ? ` / ${r.max_volunteers}` : ""}
                    </td>
                    <td className="px-3 py-2 text-right">{r.attended}</td>
                    <td className="px-3 py-2 text-right">{formatHours(r.hours)}</td>
                    <td className="px-3 py-2 text-right">{formatPct(r.fill_rate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

export default OrgAnalyticsPanel;
