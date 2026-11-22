import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, BellRing, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { reminderPermission, requestReminderPermission } from "@/hooks/useEventReminders";
import NotificationList from "./NotificationList";

export default function NotificationBell() {
  const { user } = useAuth();
  const { notifications, unread, isLoading, notEnabled, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const [perm, setPerm] = useState(reminderPermission());
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const close = useCallback((restoreFocus = false) => {
    setOpen(false);
    if (restoreFocus) buttonRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close(true);
        return;
      }
      if (e.key === "Tab" && panelRef.current) {
        const f = panelRef.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])");
        if (f.length === 0) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);
    panelRef.current?.querySelector<HTMLElement>("a[href], button")?.focus();
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  if (!user) return null;

  const enableReminders = async () => setPerm(await requestReminderPermission());

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Bell className="h-5 w-5" aria-hidden="true" />
        <span aria-live="polite" className="sr-only">
          {unread > 0 ? `${unread} unread notifications` : ""}
        </span>
        {unread > 0 && (
          <span
            aria-hidden="true"
            className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground"
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 z-50 mt-2 flex max-h-[28rem] w-[22rem] max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-xl border border-border bg-background shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <h2 className="text-sm font-semibold">Notifications</h2>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-xs"
              disabled={unread === 0}
              onClick={markAllRead}
            >
              <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" /> Mark all read
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {notEnabled ? (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                Notifications are not enabled yet.
              </p>
            ) : isLoading ? (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">Loading...</p>
            ) : (
              <NotificationList notifications={notifications} onRead={markRead} onNavigate={() => close()} />
            )}
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-2">
            {perm === "default" ? (
              <Button type="button" variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={enableReminders}>
                <BellRing className="h-3.5 w-3.5" aria-hidden="true" /> Enable reminders
              </Button>
            ) : (
              <span className="text-xs text-muted-foreground">
                {perm === "granted" ? "Reminders on" : perm === "denied" ? "Reminders blocked" : ""}
              </span>
            )}
            <Link
              to="/notifications"
              onClick={() => close()}
              className="text-xs font-medium text-primary hover:underline"
            >
              View all
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
