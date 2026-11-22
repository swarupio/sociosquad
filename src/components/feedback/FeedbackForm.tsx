import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMyReview, useSubmitReview } from "@/hooks/useFeedback";
import { isMissingMigration } from "@/lib/db";
import { MAX_COMMENT_LENGTH, validateReview } from "@/lib/feedback";
import { StarRating } from "./StarRating";

interface FeedbackFormProps {
  opportunityId: string;
  onDone?: () => void;
}

export function FeedbackForm({ opportunityId, onDone }: FeedbackFormProps) {
  const { toast } = useToast();
  const mine = useMyReview(opportunityId);
  const submit = useSubmitReview();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mine.data) {
      setRating(mine.data.rating);
      setComment(mine.data.comment ?? "");
    }
  }, [mine.data]);

  if (mine.isError && isMissingMigration(mine.error)) {
    return <p className="text-sm text-muted-foreground">Reviews are not enabled yet.</p>;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const check = validateReview({ rating, comment });
    if (!check.valid) {
      setError(check.errors.rating ?? check.errors.comment ?? "Invalid review");
      return;
    }
    setError(null);
    submit.mutate(
      { opportunityId, rating, comment },
      {
        onSuccess: () => {
          toast({ title: mine.data ? "Review updated" : "Thanks for your review!" });
          onDone?.();
        },
        onError: (err) => {
          const msg = isMissingMigration(err)
            ? "Reviews are not enabled yet."
            : /row-level security|policy/i.test(err.message)
              ? "Only volunteers who attended this event can review it."
              : err.message;
          setError(msg);
          toast({ title: "Could not save review", description: msg, variant: "destructive" });
        },
      },
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3" noValidate>
      <div className="space-y-1">
        <Label id="feedback-rating-label">Your rating</Label>
        <StarRating value={rating} onChange={setRating} label="Your rating" size={28} />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`feedback-comment-${opportunityId}`}>Comment (optional)</Label>
        <Textarea
          id={`feedback-comment-${opportunityId}`}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={MAX_COMMENT_LENGTH}
          rows={4}
          placeholder="What went well? What could be better?"
          aria-describedby="feedback-comment-count"
        />
        <p id="feedback-comment-count" className="text-xs text-muted-foreground text-right">
          {comment.length}/{MAX_COMMENT_LENGTH}
        </p>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" disabled={submit.isPending || mine.isLoading}>
        {submit.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
        {mine.data ? "Update review" : "Submit review"}
      </Button>
    </form>
  );
}

export default FeedbackForm;
