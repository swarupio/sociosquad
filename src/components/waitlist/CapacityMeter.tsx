import { Progress } from "@/components/ui/progress";
import { capacityState, fillRatio, spotsLabel } from "@/lib/waitlist";
import { cn } from "@/lib/utils";

export interface CapacityMeterProps {
  registered: number;
  max: number | null | undefined;
  waitlisted?: number;
  className?: string;
}

export function CapacityMeter({ registered, max, waitlisted = 0, className }: CapacityMeterProps) {
  const state = capacityState(registered, max, waitlisted);
  const label = spotsLabel(registered, max, waitlisted);
  const pct = Math.round(fillRatio(registered, max) * 100);
  const hasMax = !!max && max > 0;
  return (
    <div className={cn("space-y-1", className)}>
      {hasMax && (
        <Progress
          value={pct}
          aria-label={`Capacity: ${registered} of ${max} spots filled`}
          className={cn(
            "h-2",
            state === "full" || state === "waitlist"
              ? "[&>div]:bg-destructive"
              : state === "filling"
                ? "[&>div]:bg-amber-500"
                : "",
          )}
        />
      )}
      <p className="text-xs text-muted-foreground">
        {label}
        {hasMax ? ` (${registered}/${max})` : ""}
      </p>
    </div>
  );
}

export default CapacityMeter;
