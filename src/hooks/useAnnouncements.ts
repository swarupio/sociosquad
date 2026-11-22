import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { db, isMissingMigration, unwrap } from "@/lib/db";
import { useAuth } from "@/hooks/useAuth";
import { validateAnnouncement } from "@/lib/announcements";

export interface Announcement {
  id: string;
  opportunity_id: string;
  org_id: string;
  title: string;
  body: string;
  pinned: boolean;
  created_at: string;
}

export interface MyAnnouncement extends Announcement {
  opportunity_title: string;
}

export interface AnnouncementsResult<T> {
  items: T[];
  /** True when the announcements migration has not been applied yet. */
  notEnabled: boolean;
}

const COLUMNS = "id, opportunity_id, org_id, title, body, pinned, created_at";

export function useOpportunityAnnouncements(opportunityId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["announcements", opportunityId],
    enabled: !!opportunityId && !!user,
    staleTime: 30_000,
    queryFn: async (): Promise<AnnouncementsResult<Announcement>> => {
      try {
        const rows = unwrap(
          await db
            .from<Announcement[]>("opportunity_announcements")
            .select(COLUMNS)
            .eq("opportunity_id", opportunityId!)
            .order("created_at", { ascending: false })
            .limit(100),
        );
        return { items: rows ?? [], notEnabled: false };
      } catch (e) {
        if (isMissingMigration(e)) return { items: [], notEnabled: true };
        throw e;
      }
    },
  });
}

export function useMyAnnouncements(limit = 30, enabled = true) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["announcements", "mine", user?.id, limit],
    enabled: enabled && !!user,
    staleTime: 30_000,
    queryFn: async (): Promise<AnnouncementsResult<MyAnnouncement>> => {
      try {
        const rows = unwrap(await db.rpc<MyAnnouncement[]>("get_my_announcements", { p_limit: limit }));
        return { items: rows ?? [], notEnabled: false };
      } catch (e) {
        if (isMissingMigration(e)) return { items: [], notEnabled: true };
        throw e;
      }
    },
  });
}

export function useCreateAnnouncement(opportunityId: string, orgId: string) {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { title: string; body: string; pinned?: boolean }) => {
      if (!user) throw new Error("You must be signed in");
      const v = validateAnnouncement(input);
      if (!v.valid) throw new Error(Object.values(v.errors)[0] ?? "Invalid announcement");
      try {
        return unwrap(
          await db
            .from<Announcement>("opportunity_announcements")
            .insert({
              opportunity_id: opportunityId,
              org_id: orgId,
              author_id: user.id,
              title: v.value.title,
              body: v.value.body,
              pinned: !!input.pinned,
            })
            .select(COLUMNS)
            .single(),
        );
      } catch (e) {
        if (isMissingMigration(e)) throw new Error("Announcements are not enabled yet");
        throw e;
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["announcements"] });
    },
  });
}

export function useDeleteAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      unwrap(await db.from("opportunity_announcements").delete().eq("id", id));
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["announcements"] });
    },
  });
}
