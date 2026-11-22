import { Link } from "react-router-dom";
import { Megaphone, Pin, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  useDeleteAnnouncement,
  useMyAnnouncements,
  useOpportunityAnnouncements,
  type Announcement,
  type MyAnnouncement,
} from "@/hooks/useAnnouncements";
import { groupPinnedFirst, relativeTime } from "@/lib/announcements";

interface AnnouncementFeedProps {
  /** When set, shows updates for that opportunity; otherwise the caller's cross-event feed. */
  opportunityId?: string;
  canManage?: boolean;
}

function FeedBody({ opportunityId, canManage }: AnnouncementFeedProps) {
  const { toast } = useToast();
  const single = useOpportunityAnnouncements(opportunityId);
  const mine = useMyAnnouncements(30, !opportunityId);
  const del = useDeleteAnnouncement();
  const q = opportunityId ? single : mine;

  if (q.isLoading) {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Loading updates">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }
  if (q.isError) {
    return (
      <p role="alert" className="text-sm text-destructive">
        Could not load updates.{" "}
        <button type="button" className="underline" onClick={() => void q.refetch()}>
          Retry
        </button>
      </p>
    );
  }
  if (q.data?.notEnabled) {
    return <p className="text-sm text-muted-foreground">Event updates are not enabled yet.</p>;
  }

  const items = groupPinnedFirst<Announcement | MyAnnouncement>(q.data?.items ?? []);
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-6 text-center text-muted-foreground">
        <Megaphone className="h-6 w-6" aria-hidden="true" />
        <p className="text-sm">No updates yet.</p>
      </div>
    );
  }

  const onDelete = (id: string) => {
    del.mutate(id, {
      onSuccess: () => toast({ title: "Update deleted" }),
      onError: (err) =>
        toast({
          title: "Could not delete update",
          description: err instanceof Error ? err.message : "Please try again.",
          variant: "destructive",
        }),
    });
  };

  return (
    <ul className="space-y-3">
      {items.map((a) => (
        <li key={a.id} className="glass-card rounded-xl p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 space-y-1">
              {"opportunity_title" in a && (
                <Link
                  to={`/opportunities/${a.opportunity_id}`}
                  className="text-xs text-primary hover:underline"
                >
                  {a.opportunity_title}
                </Link>
              )}
              <h4 className="flex items-center gap-2 break-words font-semibold text-foreground">
                {a.pinned && (
                  <Badge variant="secondary" className="gap-1">
                    <Pin className="h-3 w-3" aria-hidden="true" />
                    Pinned
                  </Badge>
                )}
                {a.title}
              </h4>
            </div>
            {canManage && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Delete update: ${a.title}`}
                disabled={del.isPending}
                onClick={() => onDelete(a.id)}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </Button>
            )}
          </div>
          <p className="mt-2 whitespace-pre-wrap break-words text-sm text-foreground/90">{a.body}</p>
          <time dateTime={a.created_at} className="mt-2 block text-xs text-muted-foreground">
            {relativeTime(a.created_at)}
          </time>
        </li>
      ))}
    </ul>
  );
}

export function AnnouncementFeed(props: AnnouncementFeedProps) {
  return (
    <section aria-label="Event updates">
      <FeedBody {...props} />
    </section>
  );
}

export default AnnouncementFeed;
