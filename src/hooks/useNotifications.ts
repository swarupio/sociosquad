import { useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { db, isMissingMigration, unwrap } from "@/lib/db";
import { supabase } from "@/lib/supabaseClient";
import { NOTIFICATION_COLUMNS, unreadCount, type AppNotification } from "@/lib/notifications";

const LIMIT = 50;

interface NotificationsResult {
  items: AppNotification[];
  notEnabled: boolean;
}

export function useNotifications() {
  const { user } = useAuth();
  const userId = user?.id;
  const qc = useQueryClient();
  const queryKey = useMemo(() => ["notifications", userId] as const, [userId]);

  const query = useQuery({
    queryKey,
    enabled: !!userId,
    staleTime: 30_000,
    queryFn: async (): Promise<NotificationsResult> => {
      try {
        const res = await db
          .from<AppNotification[]>("notifications")
          .select(NOTIFICATION_COLUMNS)
          .eq("user_id", userId as string)
          .order("created_at", { ascending: false })
          .limit(LIMIT);
        return { items: unwrap(res) ?? [], notEnabled: false };
      } catch (e) {
        if (isMissingMigration(e)) return { items: [], notEnabled: true };
        throw e;
      }
    },
  });

  const notEnabled = query.data?.notEnabled ?? false;

  useEffect(() => {
    if (!userId || notEnabled) return;
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        () => {
          void qc.invalidateQueries({ queryKey });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, notEnabled, qc, queryKey]);

  const markRead = useMutation({
    mutationFn: async (ids: string[]) => {
      unwrap(await db.rpc("mark_notifications_read", { p_ids: ids }));
    },
    onSuccess: (_d, ids) => {
      const now = new Date().toISOString();
      qc.setQueryData<NotificationsResult>(queryKey, (old) =>
        old
          ? { ...old, items: old.items.map((i) => (ids.includes(i.id) && !i.read_at ? { ...i, read_at: now } : i)) }
          : old,
      );
    },
    onError: () => void qc.invalidateQueries({ queryKey }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      unwrap(await db.rpc("mark_notifications_read", { p_ids: null }));
    },
    onSuccess: () => {
      const now = new Date().toISOString();
      qc.setQueryData<NotificationsResult>(queryKey, (old) =>
        old ? { ...old, items: old.items.map((i) => (i.read_at ? i : { ...i, read_at: now })) } : old,
      );
    },
    onError: () => void qc.invalidateQueries({ queryKey }),
  });

  const items = useMemo(() => query.data?.items ?? [], [query.data]);

  return {
    notifications: items,
    unread: unreadCount(items),
    isLoading: query.isLoading,
    error: query.error as Error | null,
    notEnabled,
    markRead: (ids: string[]) => markRead.mutate(ids),
    markAllRead: () => markAllRead.mutate(),
    isMarkingAll: markAllRead.isPending,
  };
}
