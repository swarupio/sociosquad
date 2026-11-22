import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { matchTier, type MatchTier } from "@/lib/matching";

interface MatchBadgeProps {
  score: number | null;
  reasons?: string[];
  className?: string;
}

const TIER_CLASS: Record<MatchTier, string> = {
  high: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-300",
  medium: "bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-300",
  low: "bg-muted text-muted-foreground border-border",
};

export function MatchBadge({ score, reasons = [], className }: MatchBadgeProps) {
  if (score === null || score === undefined || !Number.isFinite(score)) return null;
  const pct = Math.max(0, Math.min(100, Math.round(score)));
  const why = reasons.length > 0 ? `Why: ${reasons.join("; ")}` : undefined;
  return (
    <span
      title={why}
      aria-label={`${pct}% match${why ? `. ${why}` : ""}`}
      data-testid="match-badge"
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
        TIER_CLASS[matchTier(pct)],
        className
      )}
    >
      <Sparkles className="h-3 w-3" aria-hidden="true" />
      {pct}% match
    </span>
  );
}

export default MatchBadge;
