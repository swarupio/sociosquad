import { Loader2 } from "lucide-react";

interface AsyncStateCardProps {
  title: string;
  description?: string;
  loading?: boolean;
  actionLabel?: string;
  onAction?: () => void;
}

const AsyncStateCard = ({
  title,
  description,
  loading = false,
  actionLabel,
  onAction,
}: AsyncStateCardProps) => {
  return (
    <div className="glass-card p-16 text-center">
      {loading && <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />}
      <p className={loading ? "text-muted-foreground" : "text-destructive font-medium"}>{title}</p>
      {description && <p className="text-muted-foreground text-sm mt-2">{description}</p>}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-4 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default AsyncStateCard;
