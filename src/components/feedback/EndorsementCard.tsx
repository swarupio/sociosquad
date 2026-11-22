import { Quote } from "lucide-react";
import type { Endorsement } from "@/hooks/useFeedback";
import { sanitizeComment } from "@/lib/feedback";

export function EndorsementCard({ endorsement }: { endorsement: Endorsement }) {
  return (
    <figure className="glass-card rounded-lg border border-border p-4">
      <Quote className="mb-2 h-5 w-5 text-primary" aria-hidden="true" />
      <blockquote className="break-words text-sm text-foreground/90">{sanitizeComment(endorsement.text)}</blockquote>
      <figcaption className="mt-3 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{endorsement.org_name ?? "An NGO"}</span>
        {" · "}
        <time dateTime={endorsement.created_at}>{new Date(endorsement.created_at).toLocaleDateString()}</time>
      </figcaption>
    </figure>
  );
}

export default EndorsementCard;
