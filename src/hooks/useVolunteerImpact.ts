import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useMyRegistrations, type Registration } from "@/hooks/useMyRegistrations";

const deriveImpactScore = (totalHours: number, completedEvents: number, uniqueCauses: number) => {
  return Math.min(100, Math.round(totalHours * 5 + completedEvents * 12 + uniqueCauses * 6));
};

const deriveXp = (totalHours: number, completedEvents: number, uniqueCauses: number) => {
  return Math.round(totalHours * 40 + completedEvents * 60 + uniqueCauses * 25);
};

const isCompletedRegistration = (registration: Registration) => {
  return (
    Boolean(registration.attended) ||
    registration.status === "verified" ||
    Number(registration.hours_credited ?? 0) > 0
  );
};

const deriveDayStreak = (registrations: Registration[]) => {
  const completedDates = [...new Set(
    registrations
      .filter(isCompletedRegistration)
      .map((registration) => registration.date)
      .filter(Boolean)
  )]
    .map((date) => new Date(date))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((a, b) => b.getTime() - a.getTime());

  if (completedDates.length === 0) return 0;

  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  for (const completedDate of completedDates) {
    const currentDate = new Date(completedDate);
    currentDate.setHours(0, 0, 0, 0);

    const diffInDays = Math.round((cursor.getTime() - currentDate.getTime()) / 86400000);

    if (diffInDays === 0) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
      continue;
    }

    if (diffInDays === 1 && streak === 0) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 2);
      continue;
    }

    if (diffInDays === 1) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
      continue;
    }

    break;
  }

  return streak;
};

export function useVolunteerImpact(userId: string | undefined, enabled = true) {
  const queryClient = useQueryClient();
  const registrationsQuery = useMyRegistrations(userId, { enabled });

  const statsQuery = useQuery({
    queryKey: ["user-stats", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_stats")
        .select("*")
        .eq("user_id", userId!)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: enabled && !!userId,
  });

  useEffect(() => {
    if (!enabled || !userId) return;

    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: ["my-registrations", userId] });
      queryClient.invalidateQueries({ queryKey: ["user-stats", userId] });
    };

    const channel = supabase
      .channel(`volunteer-impact-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "volunteer_registrations",
          filter: `user_id=eq.${userId}`,
        },
        invalidate
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_stats",
          filter: `user_id=eq.${userId}`,
        },
        invalidate
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, userId, queryClient]);

  const registrations = registrationsQuery.data ?? [];
  const rawStats = statsQuery.data;

  const summary = useMemo(() => {
    const completedRegistrations = registrations.filter(isCompletedRegistration);
    const completedHours = completedRegistrations.reduce(
      (sum, registration) => sum + Number(registration.hours_credited ?? 0),
      0
    );
    const completedEventsFromRegistrations = completedRegistrations.length;
    const completedCauses = new Set(
      completedRegistrations.map((registration) => registration.category).filter(Boolean)
    ).size;
    const registeredCauses = new Set(
      registrations.map((registration) => registration.category).filter(Boolean)
    ).size;

    const totalHours = Math.max(Number(rawStats?.total_hours ?? 0), completedHours);
    const completedEvents = Math.max(Number(rawStats?.tasks_completed ?? 0), completedEventsFromRegistrations);
    const impactScore = Math.max(
      Number(rawStats?.impact_score ?? 0),
      deriveImpactScore(totalHours, completedEvents, completedCauses)
    );
    const derivedXp = deriveXp(totalHours, completedEvents, completedCauses);
    const xp = Math.max(Number(rawStats?.xp ?? 0), derivedXp);
    const derivedLevel = Math.max(1, Math.floor(xp / 500) + 1);
    const level = Math.max(Number(rawStats?.level ?? 1), derivedLevel);
    const xpMax = Math.max(Number(rawStats?.xp_max ?? 500), level * 500, 500);
    const dayStreak = Math.max(Number(rawStats?.day_streak ?? 0), deriveDayStreak(registrations));

    return {
      totalHours,
      completedEvents,
      impactScore,
      dayStreak,
      level,
      xp,
      xpMax,
      registeredCount: registrations.length,
      completedCount: completedRegistrations.length,
      upcomingCount: registrations.filter(
        (registration) => !isCompletedRegistration(registration) && registration.status !== "absent"
      ).length,
      uniqueCauses: registeredCauses,
      completedCauses,
    };
  }, [registrations, rawStats]);

  return {
    registrations,
    rawStats,
    summary,
    isLoading: registrationsQuery.isLoading || statsQuery.isLoading,
    isFetching: registrationsQuery.isFetching || statsQuery.isFetching,
    refetch: async () => {
      await Promise.all([registrationsQuery.refetch(), statsQuery.refetch()]);
    },
  };
}
