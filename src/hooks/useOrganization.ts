import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { geocodeLocation } from "@/lib/nominatimGeocode";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";

export interface Organization {
  id: string;
  user_id: string;
  name: string;
  description: string;
  website: string;
  contact_email: string;
  contact_phone: string;
  logo_url: string;
  address: string;
  city: string;
  verified: boolean;
  created_at: string;
}

export interface Opportunity {
  id: string;
  org_id: string;
  title: string;
  description: string;
  category: string;
  skills_needed: string[];
  date: string;
  start_time: string;
  end_time: string;
  location: string;
  city: string;
  max_volunteers: number;
  time_commitment: string;
  status: string;
  latitude?: number | null;
  longitude?: number | null;
  created_at: string;
  organization?: Organization;
  registration_count?: number;
  is_registered?: boolean;
}

export interface VolunteerRegistration {
  id: string;
  opportunity_id: string;
  user_id: string;
  status: string;
  attended: boolean;
  hours_credited: number;
  verified_by: string | null;
  verified_at: string | null;
  created_at: string;
  profile?: { full_name: string | null; avatar_url: string | null };
}

interface MutationResult {
  success: boolean;
  message?: string;
}

function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "message" in err) {
    const message = (err as { message?: unknown }).message;
    if (typeof message === "string" && message) return message;
  }
  return fallback;
}

async function fetchRegistrationCounts(opportunityIds: string[]): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  if (opportunityIds.length === 0) return counts;
  const { data, error } = await supabase
    .from("volunteer_registrations")
    .select("opportunity_id")
    .in("opportunity_id", opportunityIds);
  if (error) throw error;
  (data || []).forEach((r) => {
    counts[r.opportunity_id] = (counts[r.opportunity_id] || 0) + 1;
  });
  return counts;
}

const ROLE_STALE_MS = 5 * 60_000;

export function useUserRole() {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ["user-role", user?.id],
    enabled: !!user,
    staleTime: ROLE_STALE_MS,
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", user!.id);
      if (error) throw error;
      return (data || []).some((r) => r.role === "organization");
    },
  });

  return {
    isOrg: user ? query.data ?? false : false,
    loading: !!user && query.isLoading,
    error: query.error ? getErrorMessage(query.error, "Failed to load role") : null,
  };
}

const ORG_COLUMNS = "id, user_id, name, description, website, contact_email, contact_phone, logo_url, address, city, verified, created_at";
const OPP_COLUMNS =
  "id, org_id, title, description, category, skills_needed, date, start_time, end_time, location, city, max_volunteers, time_commitment, status, latitude, longitude, created_at";
const REG_COLUMNS = "id, opportunity_id, user_id, status, attended, hours_credited, verified_by, verified_at, created_at";
const PUBLIC_ORG_COLUMNS = "id, name, description, website, logo_url, city, verified";

export function useMyOrganization() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const queryKey = ["my-org", user?.id];

  const query = useQuery({
    queryKey,
    enabled: !!user,
    queryFn: async (): Promise<Organization | null> => {
      const { data, error } = await supabase
        .from("organizations")
        .select(ORG_COLUMNS)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as Organization) ?? null;
    },
  });

  const { refetch: refetchQuery } = query;
  const refetch = useCallback(async () => {
    await refetchQuery();
  }, [refetchQuery]);

  const createOrg = async (orgData: Partial<Organization>) => {
    if (!user) return null;

    // Best-effort role fallback (a DB trigger is the source of truth); failure is ignored.
    try {
      await supabase.from("user_roles").insert({ user_id: user.id, role: "organization" });
    } catch {
      /* ignore */
    }

    const { data, error: insertError } = await supabase
      .from("organizations")
      .insert({
        name: orgData.name || "",
        description: orgData.description || "",
        website: orgData.website || "",
        contact_email: orgData.contact_email || "",
        contact_phone: orgData.contact_phone || "",
        address: orgData.address || "",
        city: orgData.city || "Mumbai",
        user_id: user.id,
      })
      .select(ORG_COLUMNS)
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        toast({ title: "Organization already registered", description: "Your account already has an organization." });
        await queryClient.invalidateQueries({ queryKey });
        return null;
      }
      toast({ title: "Error creating organization", description: insertError.message, variant: "destructive" });
      return null;
    }
    toast({ title: "Organization registered! 🎉" });
    queryClient.setQueryData(queryKey, data as unknown as Organization);
    queryClient.invalidateQueries({ queryKey: ["user-role", user.id] });
    return data;
  };

  return {
    org: user ? query.data ?? null : null,
    loading: !!user && query.isLoading,
    error: query.error ? getErrorMessage(query.error, "Failed to load organization") : null,
    createOrg,
    refetch,
  };
}

export function useOrgOpportunities(orgId: string | undefined) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const queryKey = ["org-opportunities", orgId];

  const query = useQuery({
    queryKey,
    enabled: !!orgId,
    queryFn: async (): Promise<Opportunity[]> => {
      const { data, error } = await supabase
        .from("opportunities")
        .select(OPP_COLUMNS)
        .eq("org_id", orgId!)
        .order("date", { ascending: true });
      if (error) throw error;

      const opps = data || [];
      const counts = await fetchRegistrationCounts(opps.map((o) => o.id));
      return opps.map((o) => ({ ...o, registration_count: counts[o.id] || 0 })) as unknown as Opportunity[];
    },
  });

  const { refetch: refetchQuery } = query;
  const refetch = useCallback(async () => {
    await refetchQuery();
  }, [refetchQuery]);

  const createOpportunity = async (opp: Partial<Opportunity>): Promise<boolean> => {
    if (!user || !orgId) return false;

    const { latitude, longitude } = await geocodeLocation(opp.location || "", opp.city || "Mumbai", { existing: opp });
    if (latitude === null || longitude === null) {
      toast({
        title: "Could not geocode location",
        description: "The opportunity will be saved without map coordinates. Try a clearer address or city.",
      });
    }

    const { error } = await supabase
      .from("opportunities")
      .insert({
        id: crypto.randomUUID(),
        title: opp.title || "",
        description: opp.description || "",
        category: opp.category || "General",
        skills_needed: opp.skills_needed || [],
        date: opp.date || new Date().toISOString().split("T")[0],
        start_time: opp.start_time || "09:00",
        end_time: opp.end_time || "17:00",
        location: opp.location || "",
        city: opp.city || "Mumbai",
        max_volunteers: opp.max_volunteers || 50,
        time_commitment: opp.time_commitment || "Half Day",
        org_id: orgId,
        latitude,
        longitude,
      });
    if (error) {
      toast({ title: "Error creating opportunity", description: error.message, variant: "destructive" });
      return false;
    }
    toast({ title: "Opportunity posted! 📢" });
    queryClient.invalidateQueries({ queryKey });
    queryClient.invalidateQueries({ queryKey: ["public-opportunities"] });
    return true;
  };

  const deleteOpportunity = async (id: string) => {
    // Optimistic removal; roll back on failure.
    const previous = queryClient.getQueryData<Opportunity[]>(queryKey);
    queryClient.setQueryData<Opportunity[]>(queryKey, (old) => (old ?? []).filter((o) => o.id !== id));
    const { error } = await supabase.from("opportunities").delete().eq("id", id);
    if (error) {
      queryClient.setQueryData(queryKey, previous);
      toast({ title: "Error deleting", variant: "destructive" });
      return;
    }
    toast({ title: "Opportunity removed" });
    queryClient.invalidateQueries({ queryKey });
    queryClient.invalidateQueries({ queryKey: ["public-opportunities"] });
  };

  return {
    opportunities: query.data ?? [],
    loading: !!orgId && query.isLoading,
    error: query.error ? getErrorMessage(query.error, "Failed to load opportunities") : null,
    createOpportunity,
    deleteOpportunity,
    refetch,
  };
}

export function useOpportunityVolunteers(opportunityId: string | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const queryKey = ["opportunity-volunteers", opportunityId];

  const query = useQuery({
    queryKey,
    enabled: !!opportunityId,
    queryFn: async (): Promise<VolunteerRegistration[]> => {
      const { data, error } = await supabase
        .from("volunteer_registrations")
        .select(REG_COLUMNS)
        .eq("opportunity_id", opportunityId!)
        .order("created_at");
      if (error) throw error;

      const rows = data || [];
      const userIds = [...new Set(rows.map((v) => v.user_id))];
      const profiles = new Map<string, { full_name: string | null; avatar_url: string | null }>();
      if (userIds.length > 0) {
        const { data: p, error: profileError } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url")
          .in("user_id", userIds);
        if (profileError) throw profileError;
        (p || []).forEach((row) => profiles.set(row.user_id, { full_name: row.full_name, avatar_url: row.avatar_url }));
      }

      return rows.map((v) => ({ ...v, profile: profiles.get(v.user_id) ?? null })) as unknown as VolunteerRegistration[];
    },
  });

  const { refetch: refetchQuery } = query;
  const refetch = useCallback(async () => {
    await refetchQuery();
  }, [refetchQuery]);

  const verifyAttendance = async (regId: string, attended: boolean, hours: number, verifiedBy: string) => {
    const { error } = await supabase
      .from("volunteer_registrations")
      .update({
        attended,
        hours_credited: attended ? hours : 0,
        verified_by: verifiedBy,
        verified_at: new Date().toISOString(),
        status: attended ? "verified" : "absent",
      })
      .eq("id", regId);
    if (error) {
      toast({ title: "Error verifying", variant: "destructive" });
      return;
    }
    toast({ title: attended ? "Attendance verified ✅" : "Marked absent" });
    queryClient.invalidateQueries({ queryKey });
  };

  return {
    volunteers: query.data ?? [],
    loading: !!opportunityId && query.isLoading,
    error: query.error ? getErrorMessage(query.error, "Failed to load volunteers") : null,
    verifyAttendance,
    refetch,
  };
}

export function usePublicOpportunities() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["public-opportunities", user?.id ?? null],
    queryFn: async (): Promise<Opportunity[]> => {
      const { data, error } = await supabase
        .from("opportunities")
        .select(OPP_COLUMNS)
        .eq("status", "open")
        .gte("date", new Date().toISOString().split("T")[0])
        .order("date", { ascending: true });
      if (error) throw error;
      if (!data || data.length === 0) return [];

      const orgIds = [...new Set(data.map((o) => o.org_id))];
      const ids = data.map((o) => o.id);

      // Independent lookups run in parallel instead of sequentially.
      const [orgsResult, counts, mineResult] = await Promise.all([
        supabase.from("organizations").select(PUBLIC_ORG_COLUMNS).in("id", orgIds),
        fetchRegistrationCounts(ids),
        user
          ? supabase.from("volunteer_registrations").select("opportunity_id").eq("user_id", user.id).in("opportunity_id", ids)
          : Promise.resolve({ data: [] as { opportunity_id: string }[], error: null }),
      ]);
      if (orgsResult.error) throw orgsResult.error;
      if (mineResult.error) throw mineResult.error;

      const orgMap = new Map((orgsResult.data || []).map((org) => [org.id, org]));
      const registeredIds = new Set((mineResult.data || []).map((r) => r.opportunity_id));

      return data.map((o) => ({
        ...o,
        organization: orgMap.get(o.org_id) ?? null,
        registration_count: counts[o.id] || 0,
        is_registered: registeredIds.has(o.id),
      })) as unknown as Opportunity[];
    },
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["public-opportunities"] });
    queryClient.invalidateQueries({ queryKey: ["my-registrations"] });
  }, [queryClient]);

  const { refetch: refetchQuery } = query;
  const refetch = useCallback(async () => {
    await refetchQuery();
  }, [refetchQuery]);

  const register = async (opportunityId: string): Promise<MutationResult> => {
    if (!user) {
      return { success: false, message: "Please sign in to register" };
    }

    const { error } = await supabase
      .from("volunteer_registrations")
      .insert({ opportunity_id: opportunityId, user_id: user.id });

    if (error) {
      return { success: false, message: error.message };
    }

    invalidate();
    return { success: true };
  };

  const unregister = async (opportunityId: string): Promise<MutationResult> => {
    if (!user) {
      return { success: false, message: "Please sign in to update registration" };
    }

    const { error } = await supabase
      .from("volunteer_registrations")
      .delete()
      .eq("opportunity_id", opportunityId)
      .eq("user_id", user.id);

    if (error) {
      return { success: false, message: error.message };
    }

    invalidate();
    return { success: true };
  };

  return {
    opportunities: query.data ?? [],
    loading: query.isLoading,
    error: query.error ? getErrorMessage(query.error, "Failed to load opportunities") : null,
    register,
    unregister,
    refetch,
  };
}
