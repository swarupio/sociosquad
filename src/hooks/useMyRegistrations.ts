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
  // Joined opportunity fields
  title: string;
  date: string;
  category: string;
  location: string;
  start_time: string | null;
  end_time: string | null;
  org_name: string;
}

export function useMyRegistrations(userId: string | undefined) {
  return useQuery({
    queryKey: ["my-registrations", userId],
    queryFn: async (): Promise<Registration[]> => {
      // Fetch registrations with opportunity + org details
      const { data: regs, error } = await supabase
        .from("volunteer_registrations")
        .select("*, opportunities(title, date, category, location, start_time, end_time, org_id)")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!regs || regs.length === 0) return [];

      // Get org names
      const orgIds = [...new Set(regs.map((r: any) => r.opportunities?.org_id).filter(Boolean))];
      const { data: orgs } = orgIds.length > 0
        ? await supabase.from("organizations").select("id, name").in("id", orgIds)
        : { data: [] };

      const orgMap = new Map((orgs || []).map((o: any) => [o.id, o.name]));

      return regs.map((r: any) => {
        const opp = r.opportunities;
        return {
          id: r.id,
          opportunity_id: r.opportunity_id,
          status: r.status,
          attended: r.attended,
          hours_credited: r.hours_credited,
          created_at: r.created_at,
          title: opp?.title ?? "Unknown Opportunity",
          date: opp?.date ?? "",
          category: opp?.category ?? "",
          location: opp?.location ?? "",
          start_time: opp?.start_time ?? null,
          end_time: opp?.end_time ?? null,
          org_name: orgMap.get(opp?.org_id) ?? "NGO",
        };
      });
    },
    enabled: !!userId,
  });
}
