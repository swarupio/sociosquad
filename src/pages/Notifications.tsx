import { useState } from "react";
import { Navigate } from "react-router-dom";
import { CheckCheck } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import NotificationList from "@/components/notifications/NotificationList";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";

type Filter = "all" | "unread";

export default function Notifications() {
  const { user, isReady } = useAuth();
  const { notifications, unread, isLoading, error, notEnabled, markRead, markAllRead } = useNotifications();
  const [filter, setFilter] = useState<Filter>("all");

  if (isReady && !user) return <Navigate to="/auth" replace />;

  const shown = filter === "unread" ? notifications.filter((n) => !n.read_at) : notifications;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto max-w-2xl px-4 pb-16 pt-28">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">Notifications</h1>
          <Button type="button" variant="outline" size="sm" disabled={unread === 0} onClick={markAllRead} className="gap-1">
            <CheckCheck className="h-4 w-4" aria-hidden="true" /> Mark all read
          </Button>
        </div>

        <div role="group" aria-label="Filter notifications" className="mb-4 flex gap-2">
          {(["all", "unread"] as const).map((f) => (
            <Button
              key={f}
              type="button"
              size="sm"
              variant={filter === f ? "default" : "outline"}
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
            >
              {f === "all" ? "All" : `Unread${unread ? ` (${unread})` : ""}`}
            </Button>
          ))}
        </div>

        <div className="glass-card overflow-hidden rounded-xl">
          {notEnabled ? (
            <p className="px-4 py-12 text-center text-sm text-muted-foreground">Notifications are not enabled yet.</p>
          ) : error ? (
            <p role="alert" className="px-4 py-12 text-center text-sm text-destructive">
              Could not load notifications. Please try again later.
            </p>
          ) : isLoading ? (
            <div className="space-y-3 p-4">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : (
            <NotificationList
              notifications={shown}
              onRead={markRead}
              emptyText={filter === "unread" ? "No unread notifications." : "You're all caught up."}
            />
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
