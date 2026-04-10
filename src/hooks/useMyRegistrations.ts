import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { staticOpportunities } from "@/data/staticOpportunities";

export interface Registration {
  id: string;
  opportunity_id: string;
  status: string;
  attended: boolean | null;
  hours_credited: number | null;
  created_at: string;
  title: string;
  date: string;
  category: string;
  location: string;
  start_time: string | null;
  end_time: string | null;
  org_name: string;
  source: "database" | "static";
}

const staticOpportunityMap = new Map(staticOpportunities.map((opp) => [opp.id, opp]));

interface UseMyRegistrationsOptions {
  enabled?: boolean;
}

export function useMyRegistrations(userId: string | undefined, options?: UseMyRegistrationsOptions) {
  return useQuery({
    queryKey: ["my-registrations", userId],
    queryFn: async (): Promise<Registration[]> => {
      const { data: regs, error } = await supabase
        .from("volunteer_registrations")
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!regs || regs.length === 0) return [];

      const dbOpportunityIds = [
        ...new Set(
          regs
            .map((reg: any) => reg.opportunity_id)
            .filter((opportunityId: string) => opportunityId && !staticOpportunityMap.has(opportunityId))
        ),
      ];

      const { data: dbOpportunities, error: opportunitiesError } = dbOpportunityIds.length > 0
        ? await supabase
            .from("opportunities")
            .select("id, title, date, category, location, start_time, end_time, org_id")
            .in("id", dbOpportunityIds)
        : { data: [], error: null };

      if (opportunitiesError) throw opportunitiesError;

      const opportunitiesMap = new Map((dbOpportunities || []).map((opp: any) => [opp.id, opp]));
      const orgIds = [
        ...new Set((dbOpportunities || []).map((opp: any) => opp.org_id).filter(Boolean)),
      ];

      const { data: orgs, error: orgsError } = orgIds.length > 0
        ? await supabase.from("organizations").select("id, name").in("id", orgIds)
        : { data: [], error: null };

      if (orgsError) throw orgsError;

      const orgMap = new Map((orgs || []).map((org: any) => [org.id, org.name]));

      return regs.map((reg: any) => {
        const staticOpportunity = staticOpportunityMap.get(reg.opportunity_id);
        if (staticOpportunity) {
          return {
            id: reg.id,
            opportunity_id: reg.opportunity_id,
            status: reg.status,
            attended: reg.attended,
            hours_credited: reg.hours_credited,
            created_at: reg.created_at,
            title: staticOpportunity.title,
            date: staticOpportunity.date,
            category: staticOpportunity.category,
            location: staticOpportunity.location,
            start_time: staticOpportunity.startTime,
            end_time: staticOpportunity.endTime,
            org_name: staticOpportunity.org,
            source: "static" as const,
          };
        }

        const opportunity = opportunitiesMap.get(reg.opportunity_id);
        return {
          id: reg.id,
          opportunity_id: reg.opportunity_id,
          status: reg.status,
          attended: reg.attended,
          hours_credited: reg.hours_credited,
          created_at: reg.created_at,
          title: opportunity?.title ?? "Unknown Opportunity",
          date: opportunity?.date ?? "",
          category: opportunity?.category ?? "General",
          location: opportunity?.location ?? "Location TBA",
          start_time: opportunity?.start_time ?? null,
          end_time: opportunity?.end_time ?? null,
          org_name: orgMap.get(opportunity?.org_id) ?? "NGO",
          source: "database" as const,
        };
      });
    },
    enabled: (options?.enabled ?? true) && !!userId,
  });
}
