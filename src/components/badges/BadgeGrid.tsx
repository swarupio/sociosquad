import { Lock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useBadges } from "@/hooks/useBadges";
import { getBadgeIcon, getTierStyle, progressToward } from "@/lib/badges";
import { cn } from "@/lib/utils";

interface BadgeGridProps {
  compact?: boolean;
  className?: string;
}

export function BadgeGrid({ compact = false, className }: BadgeGridProps) {
  const { definitions, earnedCodes, earned, stats, isLoading, isError, notEnabled } = useBadges();

  if (notEnabled) {
    return (
      <p className="text-sm text-muted-foreground" role="status">
        Badges are not enabled yet. Check back soon.
      </p>
    );
  }
  if (isError) {
    return (
      <p className="text-sm text-destructive" role="alert">
        Could not load badges.
      </p>
    );
  }
  if (isLoading) {
    return (
      <div className={cn("grid gap-3 grid-cols-2 sm:grid-cols-3", className)} aria-busy="true">
        {Array.from({ length: compact ? 3 : 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  const earnedAt = new Map(earned.map((e) => [e.badge_code, e.earned_at]));
  const list = compact ? definitions.filter((d) => earnedCodes.has(d.code)).slice(0, 6) : definitions;

  if (list.length === 0) {
    return (
      <p className="text-sm text-muted-foreground" role="status">
        No badges yet. Get your first volunteering hours verified to earn one.
      </p>
    );
  }

  return (
    <TooltipProvider delayDuration={150}>
      <ul
        className={cn(
          "grid gap-3",
          compact ? "grid-cols-3 sm:grid-cols-6" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
          className,
        )}
        aria-label="Badges"
      >
        {list.map((b) => {
          const isEarned = earnedCodes.has(b.code);
          const Icon = isEarned ? getBadgeIcon(b.icon) : Lock;
          const tier = getTierStyle(b.tier);
          const p = progressToward(b, stats);
          const status = isEarned
            ? `Earned${earnedAt.get(b.code) ? ` on ${new Date(earnedAt.get(b.code)!).toLocaleDateString()}` : ""}`
            : `Locked, ${p.current} of ${p.target}`;
          return (
            <li key={b.code}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    tabIndex={0}
                    role="group"
                    aria-label={`${b.name}, ${tier.label} badge. ${status}. ${b.description}`}
                    className={cn(
                      "glass-card flex h-full flex-col items-center gap-2 rounded-xl border p-3 text-center outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      isEarned ? cn(tier.ring, tier.bg) : "border-border opacity-70",
                    )}
                  >
                    <Icon className={cn("h-6 w-6", isEarned ? tier.text : "text-muted-foreground")} aria-hidden="true" />
                    <span className="text-xs font-semibold leading-tight text-foreground">{b.name}</span>
                    {!compact && !isEarned && p.target > 0 && (
                      <div className="w-full">
                        <Progress value={p.pct} className="h-1.5" aria-label={`${b.name} progress`} />
                        <span className="mt-1 block text-[10px] text-muted-foreground">
                          {p.current}/{p.target}
                        </span>
                      </div>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">{b.name}</p>
                  <p className="text-xs">{b.description}</p>
                  <p className="text-xs text-muted-foreground">{status}</p>
                </TooltipContent>
              </Tooltip>
            </li>
          );
        })}
      </ul>
    </TooltipProvider>
  );
}

export default BadgeGrid;
