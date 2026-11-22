import { Link } from "react-router-dom";
import { Award, Bell, CalendarClock, CheckCircle2, Megaphone, ShieldCheck, Clock } from "lucide-react";
import { groupByDay, relativeTime, type AppNotification, type NotificationType } from "@/lib/notifications";
import { cn } from "@/lib/utils";

const ICONS: Record<NotificationType, typeof Bell> = {
  reminder: CalendarClock,
  registration: CheckCircle2,
  verification: ShieldCheck,
  announcement: Megaphone,
  badge: Award,
  waitlist: Clock,
  system: Bell,
};

interface NotificationListProps {
  notifications: AppNotification[];
  onRead: (ids: string[]) => void;
  /** Called after an item is clicked (e.g. to close a dropdown). */
  onNavigate?: () => void;
  emptyText?: string;
}

export default function NotificationList({
  notifications,
  onRead,
  onNavigate,
  emptyText = "You're all caught up.",
}: NotificationListProps) {
  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-sm text-muted-foreground">
        <Bell className="h-6 w-6" aria-hidden="true" />
        <p>{emptyText}</p>
      </div>
    );
  }

  const groups = groupByDay(notifications);

  return (
    <div>
      {groups.map((g) => (
        <section key={g.key} aria-label={g.label}>
          <h3 className="sticky top-0 bg-background/95 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {g.label}
          </h3>
          <ul>
            {g.items.map((n) => {
              const Icon = ICONS[n.type] ?? Bell;
              const unread = !n.read_at;
              const content = (
                <>
                  <span
                    className={cn(
                      "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                      unread ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cn("block text-sm", unread ? "font-semibold" : "font-medium")}>{n.title}</span>
                    {n.body && <span className="mt-0.5 block text-xs text-muted-foreground line-clamp-2">{n.body}</span>}
                    <span className="mt-1 block text-[11px] text-muted-foreground">{relativeTime(n.created_at)}</span>
                  </span>
                  {unread && (
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="Unread" role="img" />
                  )}
                </>
              );
              const cls = cn(
                "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none",
                unread && "bg-primary/5",
              );
              const handle = () => {
                if (unread) onRead([n.id]);
                onNavigate?.();
              };
              return (
                <li key={n.id} className="border-b border-border/50 last:border-b-0">
                  {n.link ? (
                    <Link to={n.link} className={cls} onClick={handle}>
                      {content}
                    </Link>
                  ) : (
                    <button type="button" className={cls} onClick={handle}>
                      {content}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
