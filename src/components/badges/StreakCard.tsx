import { Flame } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useBadges } from "@/hooks/useBadges";
import { cn } from "@/lib/utils";

function encouragement(current: number, activeThisWeek: boolean): string {
  if (current === 0) return "Join an event this week to start a streak.";
  if (!activeThisWeek) return "Volunteer this week to keep your streak alive.";
  if (current >= 4) return "Incredible consistency. You are making a real difference.";
  return "Nice work. Keep showing up every week.";
}

export function StreakCard({ className }: { className?: string }) {
  const { streak, activeThisWeek, isLoading, isError, notEnabled } = useBadges();

  return (
    <Card className={cn("glass-card", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Flame className="h-5 w-5 text-orange-500" aria-hidden="true" />
          Weekly streak
        </CardTitle>
      </CardHeader>
      <CardContent>
        {notEnabled ? (
          <p className="text-sm text-muted-foreground" role="status">
            Streaks are not enabled yet.
          </p>
        ) : isError ? (
          <p className="text-sm text-destructive" role="alert">
            Could not load your streak.
          </p>
        ) : isLoading || !streak ? (
          <Skeleton className="h-16 w-full" />
        ) : (
          <div className="space-y-3">
            <div className="flex items-end gap-6">
              <div>
                <p className="text-3xl font-bold text-foreground" aria-label={`Current streak ${streak.currentWeeks} weeks`}>
                  {streak.currentWeeks}
                </p>
                <p className="text-xs text-muted-foreground">current weeks</p>
              </div>
              <div>
                <p className="text-xl font-semibold text-foreground" aria-label={`Longest streak ${streak.longestWeeks} weeks`}>
                  {streak.longestWeeks}
                </p>
                <p className="text-xs text-muted-foreground">longest</p>
              </div>
              <div
                className={cn(
                  "ml-auto rounded-full border px-2.5 py-1 text-xs font-medium",
                  activeThisWeek ? "border-primary/50 bg-primary/10 text-primary" : "border-border text-muted-foreground",
                )}
              >
                {activeThisWeek ? "Active this week" : "Not yet this week"}
              </div>
            </div>
            <p className="text-sm text-muted-foreground">{encouragement(streak.currentWeeks, activeThisWeek)}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default StreakCard;
