import { useRef } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  readOnly?: boolean;
  size?: number;
  label?: string;
  className?: string;
}

const STARS = [1, 2, 3, 4, 5];

export function StarRating({ value, onChange, readOnly, size = 20, label = "Rating", className }: StarRatingProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const rounded = Math.round(value);

  if (readOnly || !onChange) {
    return (
      <span
        role="img"
        aria-label={`${label}: ${value ? value.toFixed(1) : 0} out of 5`}
        className={cn("inline-flex items-center gap-0.5", className)}
      >
        {STARS.map((n) => (
          <Star
            key={n}
            aria-hidden="true"
            style={{ width: size, height: size }}
            className={cn(n <= rounded ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/40")}
          />
        ))}
      </span>
    );
  }

  const focusStar = (n: number) => {
    const next = Math.min(5, Math.max(1, n));
    onChange(next);
    refs.current[next - 1]?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const cur = value || 0;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      focusStar(cur + 1);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      focusStar(cur <= 1 ? 1 : cur - 1);
    } else if (e.key === "Home") {
      e.preventDefault();
      focusStar(1);
    } else if (e.key === "End") {
      e.preventDefault();
      focusStar(5);
    }
  };

  return (
    <div role="radiogroup" aria-label={label} onKeyDown={onKeyDown} className={cn("inline-flex items-center gap-1", className)}>
      {STARS.map((n) => (
        <button
          key={n}
          ref={(el) => {
            refs.current[n - 1] = el;
          }}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} ${n === 1 ? "star" : "stars"}`}
          tabIndex={value === n || (!value && n === 1) ? 0 : -1}
          onClick={() => onChange(n)}
          className="rounded p-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Star
            aria-hidden="true"
            style={{ width: size, height: size }}
            className={cn("transition-colors", n <= value ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/40")}
          />
        </button>
      ))}
    </div>
  );
}

export default StarRating;
