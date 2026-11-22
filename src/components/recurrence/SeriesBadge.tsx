import { Repeat } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { RECURRENCE_LABELS, type RecurrenceRule } from "@/lib/recurrence";

interface SeriesBadgeProps {
  seriesId?: string | null;
  rule?: RecurrenceRule;
}

/** Tiny "Repeats" pill; renders nothing for one-off opportunities. */
export function SeriesBadge({ seriesId, rule }: SeriesBadgeProps) {
  if (!seriesId) return null;
  const label = rule ? RECURRENCE_LABELS[rule] : "Repeats";
  return (
    <Badge variant="secondary" className="gap-1 px-2 py-0 text-[10px] font-medium" title="Part of a recurring series">
      <Repeat className="h-3 w-3" aria-hidden="true" />
      {label}
    </Badge>
  );
}

export default SeriesBadge;
