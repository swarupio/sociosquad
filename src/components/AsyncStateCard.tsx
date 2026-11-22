import { Loader2 } from "lucide-react";

interface AsyncStateCardProps {
  title: string;
  description?: string;
  loading?: boolean;
  /** Optional explicit variant. Defaults to 'loading' when `loading`, otherwise 'error' (legacy behavior). */
  variant?: "empty" | "error" | "loading";
  actionLabel?: string;
  onAction?: () => void;
  /** Convenience: renders a "Try again" button. */
  onRetry?: () => void;
}

const AsyncStateCard = ({
  title,
  description,
  loading = false,
  variant,
  actionLabel,
  onAction,
  onRetry,
}: AsyncStateCardProps) => {
  const v = variant ?? (loading ? "loading" : "error");
  const label = actionLabel ?? (onRetry ? "Try again" : undefined);
  const handler = onAction ?? onRetry;
  return (
    <div className="glass-card p-16 text-center" role={v === "error" ? "alert" : "status"}>
      {v === "loading" && <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />}
      <p className={v === "error" ? "text-destructive font-medium" : "text-muted-foreground"}>{title}</p>
      {description && <p className="text-muted-foreground text-sm mt-2">{description}</p>}
      {label && handler && (
        <button
          onClick={handler}
          className="mt-4 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold"
        >
          {label}
        </button>
      )}
    </div>
  );
};

export default AsyncStateCard;
