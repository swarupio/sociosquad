import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { db, isMissingMigration, unwrap } from "@/lib/db";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  EMPTY_STATS,
  computeStreak,
  isActiveThisWeek,
  type BadgeDefinition,
  type BadgeStats,
  type StreakResult,
} from "@/lib/badges";

export interface EarnedBadge {
  badge_code: string;
  earned_at: string;
}

interface StreakRow {
  current_weeks: number;
  longest_weeks: number;
  last_active_week: string | null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const todayYmd = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

async function fetchStats(userId: string): Promise<BadgeStats> {
  const regs = unwrap(
    await db
      .from<{ opportunity_id: string; hours_credited: number | null }[]>("volunteer_registrations")
      .select("opportunity_id, hours_credited")
      .eq("user_id", userId)
      .eq("attended", true),
  );
  const verified = (regs ?? []).filter((r) => Number(r.hours_credited ?? 0) > 0 && UUID_RE.test(String(r.opportunity_id)));
  if (verified.length === 0) return { ...EMPTY_STATS };

  const ids = [...new Set(verified.map((r) => String(r.opportunity_id)))];
  const ops = unwrap(
    await db
      .from<{ id: string; date: string | null; start_time: string | null; category: string | null }[]>("opportunities")
      .select("id, date, start_time, category")
      .in("id", ids),
  );
  const opMap = new Map((ops ?? []).map((o) => [String(o.id), o]));

  const cats = new Set<string>();
  const dates: string[] = [];
  let events = 0;
  let hours = 0;
  let weekend = 0;
  let early = 0;
  for (const r of verified) {
    const op = opMap.get(String(r.opportunity_id));
    if (!op) continue;
    events += 1;
    hours += Number(r.hours_credited ?? 0);
    const cat = (op.category ?? "").trim().toLowerCase();
    if (cat) cats.add(cat);
    if (op.date) {
      dates.push(op.date);
      const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(op.date);
      if (m) {
        const dow = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).getUTCDay();
        if (dow === 0 || dow === 6) weekend += 1;
      }
    }
    if (op.start_time && /^\d{1,2}:\d{2}/.test(op.start_time)) {
      const hh = Number(op.start_time.split(":")[0]);
      if (hh < 9) early += 1;
    }
  }
  const streak = computeStreak(dates, todayYmd());
  return { events, hours, categories: cats.size, weekendEvents: weekend, earlyEvents: early, streakWeeks: streak.longestWeeks };
}

export function useBadges() {
  const { user } = useAuth();
  const userId = user?.id;
  const qc = useQueryClient();
  const { toast } = useToast();

  const definitionsQ = useQuery({
    queryKey: ["badge-definitions"],
    queryFn: async (): Promise<BadgeDefinition[]> =>
      unwrap(
        await db
          .from<BadgeDefinition[]>("badge_definitions")
          .select("code, name, description, icon, tier, criteria, sort")
          .order("sort", { ascending: true }),
      ) ?? [],
    staleTime: 10 * 60_000,
    retry: false,
  });

  const earnedQ = useQuery({
    queryKey: ["user-badges", userId],
    enabled: !!userId,
    queryFn: async (): Promise<EarnedBadge[]> =>
      unwrap(
        await db
          .from<EarnedBadge[]>("user_badges")
          .select("badge_code, earned_at")
          .eq("user_id", userId!)
          .order("earned_at", { ascending: false }),
      ) ?? [],
    staleTime: 60_000,
    retry: false,
  });

  const streakQ = useQuery({
    queryKey: ["my-streak", userId],
    enabled: !!userId,
    queryFn: async (): Promise<StreakResult> => {
      const row = unwrap(await db.rpc<StreakRow>("get_my_streak"));
      return {
        currentWeeks: Number(row?.current_weeks ?? 0),
        longestWeeks: Number(row?.longest_weeks ?? 0),
        lastActiveWeek: row?.last_active_week ?? null,
      };
    },
    staleTime: 60_000,
    retry: false,
  });

  const statsQ = useQuery({
    queryKey: ["badge-stats", userId],
    enabled: !!userId,
    queryFn: () => fetchStats(userId!),
    staleTime: 60_000,
    retry: false,
  });

  const definitions = useMemo(() => definitionsQ.data ?? [], [definitionsQ.data]);
  const earned = useMemo(() => earnedQ.data ?? [], [earnedQ.data]);

  const evaluateM = useMutation({
    mutationFn: async (): Promise<string[]> => unwrap(await db.rpc<string[]>("evaluate_badges")) ?? [],
    onSuccess: (codes) => {
      if (codes.length > 0) {
        const names = codes.map((c) => definitions.find((d) => d.code === c)?.name ?? c);
        toast({
          title: codes.length === 1 ? "New badge earned!" : `${codes.length} new badges earned!`,
          description: names.join(", "),
        });
      }
      qc.invalidateQueries({ queryKey: ["user-badges", userId] });
      qc.invalidateQueries({ queryKey: ["my-streak", userId] });
      qc.invalidateQueries({ queryKey: ["badge-stats", userId] });
    },
    onError: (e) => {
      if (!isMissingMigration(e)) {
        toast({ title: "Could not check badges", description: (e as Error).message, variant: "destructive" });
      }
    },
  });

  const evaluate = useCallback(() => evaluateM.mutateAsync(), [evaluateM]);

  const errors = [definitionsQ.error, earnedQ.error, streakQ.error].filter(Boolean);
  const notEnabled = errors.some((e) => isMissingMigration(e));
  const streak = streakQ.data ?? null;

  return {
    definitions,
    earned,
    earnedCodes: useMemo(() => new Set(earned.map((e) => e.badge_code)), [earned]),
    streak,
    activeThisWeek: streak ? isActiveThisWeek(streak.lastActiveWeek, todayYmd()) : false,
    stats: statsQ.data ?? EMPTY_STATS,
    isLoading: definitionsQ.isLoading || earnedQ.isLoading || streakQ.isLoading,
    isError: !notEnabled && errors.length > 0,
    notEnabled,
    evaluate,
    isEvaluating: evaluateM.isPending,
  };
}
