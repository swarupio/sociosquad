import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { staticOpportunities } from "@/data/staticOpportunities";
import { fetchPersistedStaticRegistrationIds } from "@/lib/staticRegistrationFallback";

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
const toISOStringSafe = (date: string) => new Date(`${date}T00:00:00`).toISOString();

interface UseMyRegistrationsOptions {
  enabled?: boolean;
}

export function useMyRegistrations(userId: string | undefined, options?: UseMyRegistrationsOptions) {
  return useQuery({
    queryKey: ["my-registrations", userId],
    queryFn: async (): Promise<Registration[]> => {
      const persistedStaticIds = await fetchPersistedStaticRegistrationIds(userId!);

      const { data: regs, error } = await supabase
        .from("volunteer_registrations")
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const registrationRows = regs ?? [];
      const registrationIds = new Set(registrationRows.map((reg: any) => reg.opportunity_id));
      const fallbackStaticRegistrations = staticOpportunities
        .filter((opportunity) => persistedStaticIds.has(opportunity.id) && !registrationIds.has(opportunity.id))
        .map((opportunity) => ({
          id: `static-${opportunity.id}`,
          opportunity_id: opportunity.id,
          status: "registered",
          attended: false,
          hours_credited: 0,
          created_at: toISOStringSafe(opportunity.date),
        }));

      const mergedRegistrations = [...fallbackStaticRegistrations, ...registrationRows];
      if (mergedRegistrations.length === 0) return [];

      const dbOpportunityIds = [
        ...new Set(
          mergedRegistrations
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

      return mergedRegistrations.map((reg: any) => {
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
