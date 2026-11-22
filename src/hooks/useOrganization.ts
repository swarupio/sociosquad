import { useState, useEffect, useCallback } from "react";
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

async function fetchRegistrationCounts(opportunityIds: string[]): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  if (opportunityIds.length === 0) return counts;
  const { data, error } = await supabase
    .from("volunteer_registrations")
    .select("opportunity_id")
    .in("opportunity_id", opportunityIds);
  if (error) throw error;
  (data || []).forEach((r: any) => {
    counts[r.opportunity_id] = (counts[r.opportunity_id] || 0) + 1;
  });
  return counts;
}

export function useUserRole() {
  const { user } = useAuth();
  const [isOrg, setIsOrg] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { setIsOrg(false); setError(null); setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const { data, error: roleError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);
        if (cancelled) return;
        if (roleError) throw roleError;
        setIsOrg((data || []).some((r: any) => r.role === "organization"));
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setIsOrg(false);
        setError(err instanceof Error ? err.message : "Failed to load role");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  return { isOrg, loading, error };
}

const ORG_COLUMNS = "id, user_id, name, description, website, contact_email, contact_phone, logo_url, address, city, verified, created_at";

export function useMyOrganization() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [org, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrg = useCallback(async () => {
    if (!user) { setOrg(null); setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error: orgError } = await supabase
        .from("organizations")
        .select(ORG_COLUMNS)
        .eq("user_id", user.id)
        .maybeSingle();
      if (orgError) throw orgError;
      setOrg((data as unknown as Organization) ?? null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : (err as any)?.message || "Failed to load organization");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchOrg(); }, [fetchOrg]);

  const createOrg = async (orgData: Partial<Organization>) => {
    if (!user) return null;

    // Best-effort role fallback (a DB trigger is the source of truth); failure is ignored.
    try {
      await supabase.from("user_roles").insert({ user_id: user.id, role: "organization" as any });
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
      if ((insertError as any).code === "23505") {
        toast({ title: "Organization already registered", description: "Your account already has an organization." });
        await fetchOrg();
        return null;
      }
      toast({ title: "Error creating organization", description: insertError.message, variant: "destructive" });
      return null;
    }
    toast({ title: "Organization registered! 🎉" });
    setOrg(data as unknown as Organization);
    setError(null);
    return data;
  };

  return { org, loading, error, createOrg, refetch: fetchOrg };
}

export function useOrgOpportunities(orgId: string | undefined) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const fetchOpps = useCallback(async () => {
    if (!orgId) { setOpportunities([]); setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error: oppsError } = await supabase
        .from("opportunities")
        .select("*")
        .eq("org_id", orgId)
        .order("date", { ascending: true });
      if (oppsError) throw oppsError;

      const opps = data || [];
      const counts = await fetchRegistrationCounts(opps.map((o: any) => o.id));
      setOpportunities(opps.map((o: any) => ({ ...o, registration_count: counts[o.id] || 0 })) as any);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : (err as any)?.message || "Failed to load opportunities");
      setOpportunities([]);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => { fetchOpps(); }, [fetchOpps]);

  const createOpportunity = async (opp: Partial<Opportunity>): Promise<boolean> => {
    if (!user || !orgId) return false;

    const { latitude, longitude } = await geocodeLocation(opp.location || "", opp.city || "Mumbai", { existing: opp });
    if (latitude === null || longitude === null) {
      toast({
        title: "Could not geocode location",
        description: "The opportunity will be saved without map coordinates. Try a clearer address or city.",
      });
    }

    const opportunityId = crypto.randomUUID();

    const { error } = await supabase
      .from("opportunities")
      .insert({
        id: opportunityId,
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
    fetchOpps();
    return true;
  };

  const deleteOpportunity = async (id: string) => {
    const { error } = await supabase.from("opportunities").delete().eq("id", id);
    if (error) {
      toast({ title: "Error deleting", variant: "destructive" });
      return;
    }
    toast({ title: "Opportunity removed" });
    fetchOpps();
  };

  return { opportunities, loading, error, createOpportunity, deleteOpportunity, refetch: fetchOpps };
}

export function useOpportunityVolunteers(opportunityId: string | undefined) {
  const { toast } = useToast();
  const [volunteers, setVolunteers] = useState<VolunteerRegistration[]>([]);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const fetchVolunteers = useCallback(async () => {
    if (!opportunityId) { setVolunteers([]); setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error: regError } = await supabase
        .from("volunteer_registrations")
        .select("*")
        .eq("opportunity_id", opportunityId)
        .order("created_at");
      if (regError) throw regError;

      const userIds = (data || []).map((v: any) => v.user_id);
      let profiles: any[] = [];
      if (userIds.length > 0) {
        const { data: p, error: profileError } = await supabase.from("profiles").select("user_id, full_name, avatar_url").in("user_id", userIds);
        if (profileError) throw profileError;
        profiles = p || [];
      }

      setVolunteers(
        (data || []).map((v: any) => ({
          ...v,
          profile: profiles.find((p: any) => p.user_id === v.user_id) || null,
        }))
      );
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : (err as any)?.message || "Failed to load volunteers");
      setVolunteers([]);
    } finally {
      setLoading(false);
    }
  }, [opportunityId]);

  useEffect(() => { fetchVolunteers(); }, [fetchVolunteers]);

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
    fetchVolunteers();
  };

  return { volunteers, loading, error, verifyAttendance, refetch: fetchVolunteers };
}

export function usePublicOpportunities() {
  const { user } = useAuth();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOpps = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: opportunitiesError } = await supabase
        .from("opportunities")
        .select("*")
        .eq("status", "open")
        .gte("date", new Date().toISOString().split("T")[0])
        .order("date", { ascending: true });

      if (opportunitiesError) {
        throw opportunitiesError;
      }

      if (!data || data.length === 0) {
        setOpportunities([]);
        return;
      }

      const orgIds = [...new Set((data || []).map((o: any) => o.org_id))];
      const { data: orgs, error: orgsError } = await supabase.from("organizations").select("*").in("id", orgIds);

      if (orgsError) {
        throw orgsError;
      }

      const ids = data.map((o: any) => o.id);
      const counts = await fetchRegistrationCounts(ids);

      const registeredIds = new Set<string>();
      if (user) {
        const { data: mine, error: registrationError } = await supabase
          .from("volunteer_registrations")
          .select("opportunity_id")
          .eq("user_id", user.id)
          .in("opportunity_id", ids);
        if (registrationError) throw registrationError;
        (mine || []).forEach((r: any) => registeredIds.add(r.opportunity_id));
      }

      const enriched = data.map((o: any) => ({
        ...o,
        organization: (orgs || []).find((org: any) => org.id === o.org_id) || null,
        registration_count: counts[o.id] || 0,
        is_registered: registeredIds.has(o.id),
      }));

      setOpportunities(enriched as any);
    } catch (err) {
      const message = err instanceof Error ? err.message : (err as any)?.message || "Failed to load opportunities";
      setError(message);
      setOpportunities([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchOpps(); }, [fetchOpps]);

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

    fetchOpps();
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

    fetchOpps();
    return { success: true };
  };

  return { opportunities, loading, error, register, unregister, refetch: fetchOpps };
}
