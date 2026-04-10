import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { CalendarCategory, Task } from "@/components/schedule/types";
import type { RawEvent } from "@/components/schedule/data";
import { initialEvents, initialTasks } from "@/components/schedule/data";
import { staticOpportunities } from "@/data/staticOpportunities";

const mapDbEvent = (e: any): RawEvent => ({
  id: e.id,
  title: e.title,
  startTime: e.start_time,
  endTime: e.end_time,
  color: e.color,
  bg: e.bg,
  border: e.border,
  iconName: e.icon_name,
  badge: e.badge ?? undefined,
  category: e.category as CalendarCategory,
  description: e.description,
  registered: e.registered ?? false,
});

/** Convert an NGO opportunity into a RawEvent for the calendar */
const mapOpportunityToEvent = (opp: any, isRegistered: boolean): RawEvent => {
  const startTime = `${opp.date}T${opp.start_time || "09:00:00"}`;
  const endTime = `${opp.date}T${opp.end_time || "17:00:00"}`;

  const colorMap: Record<string, { color: string; bg: string; border: string; calCategory: string }> = {
    Environment: { color: "text-emerald-900", bg: "bg-emerald-100", border: "border-l-emerald-500", calCategory: "Environment" },
    Education: { color: "text-indigo-900", bg: "bg-indigo-100", border: "border-l-indigo-500", calCategory: "Education" },
    Healthcare: { color: "text-rose-900", bg: "bg-rose-100", border: "border-l-rose-500", calCategory: "Healthcare" },
    Health: { color: "text-rose-900", bg: "bg-rose-100", border: "border-l-rose-500", calCategory: "Healthcare" },
    Community: { color: "text-amber-900", bg: "bg-amber-100", border: "border-l-amber-500", calCategory: "Community" },
  };
  const match = colorMap[opp.category] || { color: "text-sky-900", bg: "bg-sky-100", border: "border-l-sky-500", calCategory: opp.category || "SocioSquad Events" };

  return {
    id: `opp-${opp.id}`,
    title: opp.title,
    startTime,
    endTime,
    color: match.color,
    bg: match.bg,
    border: match.border,
    iconName: "Users",
    badge: opp.organization?.name ? `${opp.organization.name}` : "NGO Event",
    category: match.calCategory as CalendarCategory,
    description: opp.description || "",
    registered: isRegistered,
  };
};

export function useScheduleData() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [rawEvents, setRawEvents] = useState<RawEvent[]>([]);
  const [oppEvents, setOppEvents] = useState<RawEvent[]>([]);
  // Track registration state for static events separately
  const [staticRegistrations, setStaticRegistrations] = useState<Set<string>>(new Set());
  const [tasks, setTasks] = useState<Record<"today" | "tomorrow", Task[]>>({ today: [], tomorrow: [] });

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id ?? null);
    });
  }, []);

  // Fetch registrations for static opportunities
  useEffect(() => {
    if (!userId) return;
    const fetchStaticRegs = async () => {
      const staticIds = staticOpportunities.map((o) => o.id);
      const { data } = await supabase
        .from("volunteer_registrations")
        .select("opportunity_id")
        .eq("user_id", userId)
        .in("opportunity_id", staticIds);
      if (data) {
        setStaticRegistrations(new Set(data.map((r: any) => r.opportunity_id)));
      }
    };
    fetchStaticRegs();
  }, [userId]);

  // Fetch NGO opportunities and convert to calendar events
  useEffect(() => {
    const fetchOpportunities = async () => {
      const { data: opps } = await supabase
        .from("opportunities")
        .select("*")
        .eq("status", "open")
        .order("date", { ascending: true });

      if (!opps || opps.length === 0) {
        setOppEvents([]);
        return;
      }

      const orgIds = [...new Set(opps.map((o: any) => o.org_id))];
      const { data: orgs } = await supabase.from("organizations").select("id, name").in("id", orgIds);

      // Batch fetch registrations instead of N+1 queries
      let registeredOppIds = new Set<string>();
      if (userId) {
        const oppIds = opps.map((o: any) => o.id);
        const { data: regs } = await supabase
          .from("volunteer_registrations")
          .select("opportunity_id")
          .eq("user_id", userId)
          .in("opportunity_id", oppIds);
        if (regs) {
          registeredOppIds = new Set(regs.map((r: any) => r.opportunity_id));
        }
      }

      const enriched = opps.map((o: any) => {
        const org = (orgs || []).find((org: any) => org.id === o.org_id);
        return mapOpportunityToEvent({ ...o, organization: org }, registeredOppIds.has(o.id));
      });

      setOppEvents(enriched);
    };

    fetchOpportunities();
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setRawEvents(initialEvents);
      setTasks(initialTasks);
      setLoading(false);
      return;
    }

    const fetchAll = async () => {
      setLoading(true);

      const { data: evData } = await supabase
        .from("user_events")
        .select("*")
        .order("created_at", { ascending: true });

      if (evData && evData.length > 0) {
        setRawEvents(evData.map(mapDbEvent));
      } else if (evData && evData.length === 0) {
        await seedEvents(userId);
      }

      const { data: taskData } = await supabase
        .from("user_tasks")
        .select("*")
        .order("created_at", { ascending: true });

      if (taskData && taskData.length > 0) {
        const today: Task[] = [];
        const tomorrow: Task[] = [];
        taskData.forEach((t: any) => {
          const task: Task = { id: t.id, text: t.text, done: t.done };
          if (t.period === "tomorrow") tomorrow.push(task);
          else today.push(task);
        });
        setTasks({ today, tomorrow });
      } else if (taskData && taskData.length === 0) {
        await seedTasks(userId);
      }

      setLoading(false);
    };

    fetchAll();
  }, [userId]);

  const seedEvents = async (uid: string) => {
    const rows = initialEvents.map((e) => ({
      user_id: uid,
      title: e.title,
      start_time: e.startTime,
      end_time: e.endTime,
      color: e.color,
      bg: e.bg,
      border: e.border,
      icon_name: e.iconName,
      badge: e.badge ?? null,
      category: e.category,
      description: e.description,
      registered: e.registered,
    }));
    const { data } = await supabase.from("user_events").insert(rows as any).select();
    if (data) {
      setRawEvents(data.map(mapDbEvent));
    }
  };

  const seedTasks = async (uid: string) => {
    const rows = [
      ...initialTasks.today.map((t) => ({ user_id: uid, text: t.text, done: t.done, period: "today" })),
      ...initialTasks.tomorrow.map((t) => ({ user_id: uid, text: t.text, done: t.done, period: "tomorrow" })),
    ];
    const { data } = await supabase.from("user_tasks").insert(rows).select();
    if (data) {
      const today: Task[] = [];
      const tomorrow: Task[] = [];
      data.forEach((t: any) => {
        const task: Task = { id: t.id, text: t.text, done: t.done };
        if (t.period === "tomorrow") tomorrow.push(task);
        else today.push(task);
      });
      setTasks({ today, tomorrow });
    }
  };

  // Convert static showcase opportunities to calendar events (now with registration tracking)
  const staticCalEvents: RawEvent[] = useMemo(() => {
    const colorMap: Record<string, { color: string; bg: string; border: string; calCategory: string }> = {
      Environment: { color: "text-emerald-900", bg: "bg-emerald-100", border: "border-l-emerald-500", calCategory: "Environment" },
      Education: { color: "text-indigo-900", bg: "bg-indigo-100", border: "border-l-indigo-500", calCategory: "Education" },
      Healthcare: { color: "text-rose-900", bg: "bg-rose-100", border: "border-l-rose-500", calCategory: "Healthcare" },
      Community: { color: "text-amber-900", bg: "bg-amber-100", border: "border-l-amber-500", calCategory: "Community" },
    };
    return staticOpportunities.map((o) => {
      const match = colorMap[o.category] || { color: "text-sky-900", bg: "bg-sky-100", border: "border-l-sky-500", calCategory: o.category };
      return {
        id: `static-${o.id}`,
        title: o.title,
        startTime: `${o.date}T${o.startTime}`,
        endTime: `${o.date}T${o.endTime}`,
        color: match.color,
        bg: match.bg,
        border: match.border,
        iconName: "Users",
        badge: o.org,
        category: match.calCategory as CalendarCategory,
        description: o.description,
        registered: staticRegistrations.has(o.id),
      };
    });
  }, [staticRegistrations]);

  // Merge user events + opportunity events + static showcase events, deduplicating by title+date
  const allRawEvents = useMemo(() => {
    const existing = new Set(
      [...rawEvents, ...oppEvents].map(e => {
        const dateKey = e.startTime.slice(0, 10);
        return `${e.title.toLowerCase().trim()}|${dateKey}`;
      })
    );
    const dedupedStatic = staticCalEvents.filter(e => {
      const dateKey = e.startTime.slice(0, 10);
      return !existing.has(`${e.title.toLowerCase().trim()}|${dateKey}`);
    });
    return [...rawEvents, ...oppEvents, ...dedupedStatic];
  }, [rawEvents, oppEvents, staticCalEvents]);

  const toggleTask = useCallback(async (period: "today" | "tomorrow", id: string) => {
    setTasks((prev) => ({
      ...prev,
      [period]: prev[period].map((t) => t.id === id ? { ...t, done: !t.done } : t),
    }));
    const task = tasks[period].find((t) => t.id === id);
    if (task && userId) {
      await supabase.from("user_tasks").update({ done: !task.done }).eq("id", id);
    }
  }, [tasks, userId]);

  const addTask = useCallback(async (period: "today" | "tomorrow", text: string) => {
    if (!text.trim()) return;
    if (!userId) {
      const newTask: Task = { id: `t-${Date.now()}`, text: text.trim(), done: false };
      setTasks((prev) => ({ ...prev, [period]: [...prev[period], newTask] }));
      return;
    }
    const { data } = await supabase
      .from("user_tasks")
      .insert({ user_id: userId, text: text.trim(), done: false, period })
      .select()
      .single();
    if (data) {
      const newTask: Task = { id: data.id, text: data.text, done: data.done };
      setTasks((prev) => ({ ...prev, [period]: [...prev[period], newTask] }));
    }
  }, [userId]);

  const editTask = useCallback(async (period: "today" | "tomorrow", id: string, newText: string) => {
    if (!newText.trim()) return;
    setTasks((prev) => ({
      ...prev,
      [period]: prev[period].map((t) => t.id === id ? { ...t, text: newText.trim() } : t),
    }));
    if (userId) {
      await supabase.from("user_tasks").update({ text: newText.trim() }).eq("id", id);
    }
  }, [userId]);

  const deleteTask = useCallback(async (period: "today" | "tomorrow", id: string) => {
    setTasks((prev) => ({ ...prev, [period]: prev[period].filter((t) => t.id !== id) }));
    if (userId) {
      await supabase.from("user_tasks").delete().eq("id", id);
    }
  }, [userId]);

  const deleteEvent = useCallback(async (id: string) => {
    setRawEvents((prev) => prev.filter((e) => e.id !== id));
    if (userId) {
      await supabase.from("user_events").delete().eq("id", id);
    }
  }, [userId]);

  const toggleRegistration = useCallback(async (id: string): Promise<boolean> => {
    // Handle static opportunity events (prefixed with "static-")
    if (id.startsWith("static-")) {
      const staticId = id.replace("static-", "");
      if (!userId) return false;

      const wasRegistered = staticRegistrations.has(staticId);

      // Optimistic update
      setStaticRegistrations((prev) => {
        const next = new Set(prev);
        if (wasRegistered) next.delete(staticId);
        else next.add(staticId);
        return next;
      });

      // DB sync
      if (wasRegistered) {
        await supabase.from("volunteer_registrations").delete().eq("opportunity_id", staticId).eq("user_id", userId);
      } else {
        await supabase.from("volunteer_registrations").insert({ opportunity_id: staticId, user_id: userId });
      }
      return !wasRegistered;
    }

    // Handle NGO opportunity events (prefixed with "opp-")
    if (id.startsWith("opp-")) {
      const oppId = id.replace("opp-", "");
      const event = oppEvents.find((e) => e.id === id);
      if (!event || !userId) return false;

      const newState = !event.registered;

      // Optimistic update
      setOppEvents((prev) => prev.map((e) => e.id === id ? { ...e, registered: newState } : e));

      // DB sync
      if (event.registered) {
        await supabase.from("volunteer_registrations").delete().eq("opportunity_id", oppId).eq("user_id", userId);
      } else {
        await supabase.from("volunteer_registrations").insert({ opportunity_id: oppId, user_id: userId });
      }
      return newState;
    }

    // Handle user_events
    const event = rawEvents.find((e) => e.id === id);
    if (!event) return false;
    const newState = !event.registered;

    // Optimistic update
    setRawEvents((prev) =>
      prev.map((e) => e.id === id ? { ...e, registered: newState } : e)
    );

    if (userId) {
      await supabase.from("user_events").update({ registered: newState }).eq("id", id);
    }
    return newState;
  }, [userId, rawEvents, oppEvents, staticRegistrations]);

  const changeCategory = useCallback(async (id: string, newCategory: string) => {
    setRawEvents((prev) =>
      prev.map((e) => e.id === id ? { ...e, category: newCategory as CalendarCategory } : e)
    );
    if (userId) {
      await supabase.from("user_events").update({ category: newCategory }).eq("id", id);
    }
  }, [userId]);

  return {
    loading,
    userId,
    rawEvents: allRawEvents,
    tasks,
    toggleTask,
    addTask,
    editTask,
    deleteTask,
    deleteEvent,
    toggleRegistration,
    changeCategory,
  };
}
