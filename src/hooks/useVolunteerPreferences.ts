import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { db, isMissingMigration, unwrap } from "@/lib/db";
import type { MatchPreferences } from "@/lib/matching";

export type VolunteerPreferences = MatchPreferences;

const COLUMNS = "user_id, skills, causes, max_distance_km, availability, home_latitude, home_longitude, updated_at";
const MAX_ITEMS = 30;

export const EMPTY_PREFERENCES: VolunteerPreferences = {
  skills: [],
  causes: [],
  max_distance_km: null,
  availability: [],
  home_latitude: null,
  home_longitude: null,
};

interface PrefsRow {
  skills: string[] | null;
  causes: string[] | null;
  max_distance_km: number | null;
  availability: string[] | null;
  home_latitude: number | null;
  home_longitude: number | null;
}

function fromRow(row: PrefsRow | null): VolunteerPreferences {
  if (!row) return EMPTY_PREFERENCES;
  return {
    skills: row.skills ?? [],
    causes: row.causes ?? [],
    max_distance_km: row.max_distance_km ?? null,
    availability: row.availability ?? [],
    home_latitude: row.home_latitude ?? null,
    home_longitude: row.home_longitude ?? null,
  };
}

function cleanList(list: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of list) {
    const v = raw.trim().slice(0, 60);
    const k = v.toLowerCase();
    if (!v || seen.has(k)) continue;
    seen.add(k);
    out.push(v);
    if (out.length >= MAX_ITEMS) break;
  }
  return out;
}

export function sanitizePreferences(p: VolunteerPreferences): VolunteerPreferences {
  const dist = p.max_distance_km;
  return {
    skills: cleanList(p.skills),
    causes: cleanList(p.causes),
    availability: cleanList(p.availability),
    max_distance_km: dist && Number.isFinite(dist) ? Math.min(500, Math.max(1, Math.round(dist))) : null,
    home_latitude: p.home_latitude,
    home_longitude: p.home_longitude,
  };
}

export function useVolunteerPreferences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;
  const queryKey = ["volunteer-preferences", userId];

  const query = useQuery({
    queryKey,
    enabled: !!userId,
    staleTime: 60_000,
    retry: (count, err) => !isMissingMigration(err) && count < 2,
    queryFn: async (): Promise<VolunteerPreferences | null> => {
      const row = unwrap<PrefsRow | null>(
        await db.from<PrefsRow>("volunteer_preferences").select(COLUMNS).eq("user_id", userId!).maybeSingle()
      );
      return row ? fromRow(row) : null;
    },
  });

  const mutation = useMutation({
    mutationFn: async (next: VolunteerPreferences) => {
      const clean = sanitizePreferences(next);
      unwrap(await db.from("volunteer_preferences").upsert({ user_id: userId!, ...clean }, { onConflict: "user_id" }));
      return clean;
    },
    onMutate: async (next) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<VolunteerPreferences | null>(queryKey);
      queryClient.setQueryData(queryKey, sanitizePreferences(next));
      return { previous };
    },
    onError: (_err, _next, ctx) => {
      queryClient.setQueryData(queryKey, ctx?.previous ?? null);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  const error = (query.error ?? mutation.error) as Error | null;
  const notEnabled = isMissingMigration(query.error) || isMissingMigration(mutation.error);

  return {
    /** null when the user has not saved preferences yet (or the feature is not enabled). */
    prefs: query.data ?? null,
    isLoading: !!userId && query.isLoading,
    isSaving: mutation.isPending,
    error,
    notEnabled,
    /** Resolves to the saved preferences; rejects on failure. */
    save: (next: VolunteerPreferences) => mutation.mutateAsync(next),
  };
}
