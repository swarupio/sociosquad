import { staticOpportunities, type StaticOpportunity } from "@/data/staticOpportunities";
import { supabase } from "@/lib/supabaseClient";

const normalizeTitle = (title: string) => title.trim().toLowerCase();
const toStaticDateTime = (date: string, time: string) => `${date}T${time}`;
const buildStaticKey = (title: string, date: string) => `${normalizeTitle(title)}|${date}`;

const staticOpportunityById = new Map(staticOpportunities.map((opportunity) => [opportunity.id, opportunity]));
const staticOpportunityByKey = new Map(
  staticOpportunities.map((opportunity) => [buildStaticKey(opportunity.title, opportunity.date), opportunity])
);

const staticThemeMap: Record<string, { color: string; bg: string; border: string }> = {
  Environment: { color: "text-emerald-900", bg: "bg-emerald-100", border: "border-l-emerald-500" },
  Education: { color: "text-indigo-900", bg: "bg-indigo-100", border: "border-l-indigo-500" },
  Healthcare: { color: "text-rose-900", bg: "bg-rose-100", border: "border-l-rose-500" },
  Community: { color: "text-amber-900", bg: "bg-amber-100", border: "border-l-amber-500" },
};

export const getStaticOpportunityById = (opportunityId: string) => staticOpportunityById.get(opportunityId) ?? null;

export const getStaticOpportunityFromEvent = (title: string, startTime: string | null | undefined) => {
  const date = startTime?.slice(0, 10);
  if (!date) return null;

  return staticOpportunityByKey.get(buildStaticKey(title, date)) ?? null;
};

export async function fetchPersistedStaticRegistrationIds(userId: string) {
  const { data, error } = await supabase
    .from("user_events")
    .select("title, start_time")
    .eq("user_id", userId)
    .eq("registered", true);

  if (error) throw error;

  const registeredIds = new Set<string>();

  (data ?? []).forEach((event) => {
    const opportunity = getStaticOpportunityFromEvent(event.title, event.start_time);
    if (opportunity) {
      registeredIds.add(opportunity.id);
    }
  });

  return registeredIds;
}

export async function isStaticOpportunityRegistered(userId: string, opportunityId: string) {
  const registeredIds = await fetchPersistedStaticRegistrationIds(userId);
  return registeredIds.has(opportunityId);
}

const buildStaticUserEventPayload = (opportunity: StaticOpportunity, userId: string) => {
  const theme = staticThemeMap[opportunity.category] ?? {
    color: "text-sky-900",
    bg: "bg-sky-100",
    border: "border-l-sky-500",
  };

  return {
    user_id: userId,
    title: opportunity.title,
    start_time: toStaticDateTime(opportunity.date, opportunity.startTime),
    end_time: toStaticDateTime(opportunity.date, opportunity.endTime),
    description: opportunity.description,
    category: opportunity.category,
    badge: opportunity.org,
    icon_name: "Users",
    color: theme.color,
    bg: theme.bg,
    border: theme.border,
    registered: true,
  };
};

export async function upsertStaticRegistration(userId: string, opportunityId: string) {
  const opportunity = getStaticOpportunityById(opportunityId);
  if (!opportunity) throw new Error("Static opportunity not found");

  const startTime = toStaticDateTime(opportunity.date, opportunity.startTime);
  const payload = buildStaticUserEventPayload(opportunity, userId);

  const { data: existingEvent, error: existingError } = await supabase
    .from("user_events")
    .select("id")
    .eq("user_id", userId)
    .eq("title", opportunity.title)
    .eq("start_time", startTime)
    .maybeSingle();

  if (existingError) throw existingError;

  if (existingEvent) {
    const { error: updateError } = await supabase
      .from("user_events")
      .update(payload)
      .eq("id", existingEvent.id);

    if (updateError) throw updateError;
    return;
  }

  const { error: insertError } = await supabase.from("user_events").insert(payload);
  if (insertError) throw insertError;
}

export async function removeStaticRegistration(userId: string, opportunityId: string) {
  const opportunity = getStaticOpportunityById(opportunityId);
  if (!opportunity) throw new Error("Static opportunity not found");

  const startTime = toStaticDateTime(opportunity.date, opportunity.startTime);

  const { error } = await supabase
    .from("user_events")
    .delete()
    .eq("user_id", userId)
    .eq("title", opportunity.title)
    .eq("start_time", startTime)
    .eq("registered", true);

  if (error) throw error;
}
