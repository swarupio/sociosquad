import { Skeleton } from "@/components/ui/skeleton";
import { useOpportunityRating, useOpportunityReviews } from "@/hooks/useFeedback";
import { isMissingMigration } from "@/lib/db";
import { firstName, formatRating, initials, sanitizeComment } from "@/lib/feedback";
import { StarRating } from "./StarRating";

export function ReviewList({ opportunityId }: { opportunityId: string }) {
  const reviews = useOpportunityReviews(opportunityId);
  const rating = useOpportunityRating(opportunityId);

  if (reviews.isLoading) {
    return (
      <div className="space-y-3" aria-busy="true">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (reviews.isError) {
    return (
      <p className="text-sm text-muted-foreground">
        {isMissingMigration(reviews.error) ? "Reviews are not enabled yet." : "Could not load reviews."}
      </p>
    );
  }

  const list = reviews.data ?? [];

  return (
    <section aria-label="Reviews" className="space-y-4">
      <div className="flex items-center gap-2">
        <StarRating value={rating.data?.avg ?? 0} readOnly label="Average rating" />
        <span className="text-sm text-muted-foreground">
          {formatRating(rating.data?.avg ?? 0, rating.data?.count ?? list.length)}
        </span>
      </div>
      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground">No reviews yet.</p>
      ) : (
        <ul className="space-y-3">
          {list.map((r) => (
            <li key={r.id} className="glass-card rounded-lg p-3">
              <div className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary"
                >
                  {initials(r.reviewer_name)}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{firstName(r.reviewer_name)}</p>
                  <div className="flex items-center gap-2">
                    <StarRating value={r.rating} readOnly size={14} label="Rating" />
                    <time className="text-xs text-muted-foreground" dateTime={r.created_at}>
                      {new Date(r.created_at).toLocaleDateString()}
                    </time>
                  </div>
                </div>
              </div>
              {r.comment && (
                <p className="mt-2 whitespace-pre-line break-words text-sm text-foreground/90">
                  {sanitizeComment(r.comment)}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default ReviewList;
