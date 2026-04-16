import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
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

export function useUserRole() {
  const { user } = useAuth();
  const [isOrg, setIsOrg] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .then(({ data }) => {
        setIsOrg((data || []).some((r: any) => r.role === "organization"));
        setLoading(false);
      });
  }, [user]);

  return { isOrg, loading };
}

export function useMyOrganization() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [org, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOrg = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("organizations")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    setOrg(data as any);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchOrg(); }, [fetchOrg]);

  const createOrg = async (orgData: Partial<Organization>) => {
    if (!user) return;
    // Add org role
    await supabase.from("user_roles").insert({ user_id: user.id, role: "organization" as any });

    const { data, error } = await supabase
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
      .select()
      .single();

    if (error) {
      toast({ title: "Error creating organization", description: error.message, variant: "destructive" });
      return null;
    }
    toast({ title: "Organization registered! 🎉" });
    setOrg(data as any);
    return data;
  };

  return { org, loading, createOrg, refetch: fetchOrg };
}

export function useOrgOpportunities(orgId: string | undefined) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOpps = useCallback(async () => {
    if (!orgId) return;
    const { data } = await supabase
      .from("opportunities")
      .select("*")
      .eq("org_id", orgId)
      .order("date", { ascending: true });

    // Get registration counts
    const opps = data || [];
    const enriched = await Promise.all(
      opps.map(async (o: any) => {
        const { count } = await supabase
          .from("volunteer_registrations")
          .select("*", { count: "exact", head: true })
          .eq("opportunity_id", o.id);
        return { ...o, registration_count: count || 0 };
      })
    );

    setOpportunities(enriched as any);
    setLoading(false);
  }, [orgId]);

  useEffect(() => { fetchOpps(); }, [fetchOpps]);

  const createOpportunity = async (opp: Partial<Opportunity>) => {
    if (!user || !orgId) return;
    const { error } = await supabase
      .from("opportunities")
      .insert({
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
      });
    if (error) {
      toast({ title: "Error creating opportunity", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Opportunity posted! 📢" });
    fetchOpps();
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

  return { opportunities, loading, createOpportunity, deleteOpportunity, refetch: fetchOpps };
}

export function useOpportunityVolunteers(opportunityId: string | undefined) {
  const { toast } = useToast();
  const [volunteers, setVolunteers] = useState<VolunteerRegistration[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchVolunteers = useCallback(async () => {
    if (!opportunityId) return;
    const { data } = await supabase
      .from("volunteer_registrations")
      .select("*")
      .eq("opportunity_id", opportunityId)
      .order("created_at");

    const userIds = (data || []).map((v: any) => v.user_id);
    let profiles: any[] = [];
    if (userIds.length > 0) {
      const { data: p } = await supabase.from("profiles").select("user_id, full_name, avatar_url").in("user_id", userIds);
      profiles = p || [];
    }

    setVolunteers(
      (data || []).map((v: any) => ({
        ...v,
        profile: profiles.find((p: any) => p.user_id === v.user_id) || null,
      }))
    );
    setLoading(false);
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

  return { volunteers, loading, verifyAttendance, refetch: fetchVolunteers };
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

      const enriched = await Promise.all(
        (data || []).map(async (o: any) => {
          const { count, error: countError } = await supabase
            .from("volunteer_registrations")
            .select("*", { count: "exact", head: true })
            .eq("opportunity_id", o.id);

          if (countError) {
            throw countError;
          }

          let is_registered = false;
          if (user) {
            const { data: reg, error: registrationError } = await supabase
              .from("volunteer_registrations")
              .select("id")
              .eq("opportunity_id", o.id)
              .eq("user_id", user.id)
              .maybeSingle();

            if (registrationError) {
              throw registrationError;
            }

            is_registered = !!reg;
          }

          return {
            ...o,
            organization: (orgs || []).find((org: any) => org.id === o.org_id) || null,
            registration_count: count || 0,
            is_registered,
          };
        })
      );

      setOpportunities(enriched as any);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load opportunities";
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
