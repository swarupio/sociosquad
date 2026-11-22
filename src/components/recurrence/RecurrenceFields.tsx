import { useId, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  MAX_OCCURRENCES,
  MIN_OCCURRENCES,
  formatYmd,
  generateOccurrenceDates,
  validateRecurrence,
  type RecurrenceRule,
} from "@/lib/recurrence";

export interface RecurrenceValue {
  rule: RecurrenceRule | "none";
  occurrences: number;
}

interface RecurrenceFieldsProps {
  value: RecurrenceValue;
  onChange: (value: RecurrenceValue) => void;
  /** First occurrence date, YYYY-MM-DD. */
  startDate: string;
}

const PREVIEW_COUNT = 5;

export function RecurrenceFields({ value, onChange, startDate }: RecurrenceFieldsProps) {
  const uid = useId();
  const repeating = value.rule !== "none";

  const error = useMemo(
    () => (repeating ? validateRecurrence({ rule: value.rule, startsOn: startDate, occurrences: value.occurrences }) : null),
    [repeating, value.rule, value.occurrences, startDate],
  );

  const preview = useMemo(() => {
    if (!repeating || error || value.rule === "none") return [];
    return generateOccurrenceDates({ rule: value.rule, startsOn: startDate, occurrences: value.occurrences });
  }, [repeating, error, value.rule, value.occurrences, startDate]);

  return (
    <fieldset className="space-y-3 rounded-lg border border-border p-3">
      <legend className="px-1 text-sm font-medium text-foreground">Recurrence</legend>

      <div className="space-y-1.5">
        <Label htmlFor={`${uid}-rule`}>Repeat</Label>
        <Select value={value.rule} onValueChange={(v) => onChange({ ...value, rule: v as RecurrenceValue["rule"] })}>
          <SelectTrigger id={`${uid}-rule`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Does not repeat</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="biweekly">Every 2 weeks</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {repeating && (
        <>
          <div className="space-y-1.5">
            <Label htmlFor={`${uid}-count`}>Number of occurrences</Label>
            <Input
              id={`${uid}-count`}
              type="number"
              inputMode="numeric"
              min={MIN_OCCURRENCES}
              max={MAX_OCCURRENCES}
              step={1}
              value={Number.isFinite(value.occurrences) ? value.occurrences : ""}
              onChange={(e) => onChange({ ...value, occurrences: e.target.value === "" ? NaN : Number(e.target.value) })}
              aria-invalid={error ? true : undefined}
              aria-describedby={`${uid}-help`}
            />
            <p id={`${uid}-help`} className={error ? "text-xs text-destructive" : "text-xs text-muted-foreground"} role={error ? "alert" : undefined}>
              {error ?? `Between ${MIN_OCCURRENCES} and ${MAX_OCCURRENCES}, including the first date.`}
            </p>
          </div>

          {preview.length > 0 && (
            <div aria-live="polite">
              <p className="text-xs font-medium text-muted-foreground">Upcoming dates</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-foreground">
                {preview.slice(0, PREVIEW_COUNT).map((d) => (
                  <li key={d}>{formatYmd(d)}</li>
                ))}
              </ul>
              {preview.length > PREVIEW_COUNT && (
                <p className="mt-1 text-xs text-muted-foreground">
                  and {preview.length - PREVIEW_COUNT} more, ending {formatYmd(preview[preview.length - 1])}
                </p>
              )}
            </div>
          )}
        </>
      )}
    </fieldset>
  );
}

export default RecurrenceFields;
