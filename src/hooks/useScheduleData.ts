import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import type { CalendarCategory, Task } from "@/components/schedule/types";
import type { RawEvent } from "@/components/schedule/data";
import { initialEvents, initialTasks } from "@/components/schedule/data";
import { staticOpportunities } from "@/data/staticOpportunities";
import {
  fetchPersistedStaticRegistrationIds,
  removeStaticRegistration,
  upsertStaticRegistration,
} from "@/lib/staticRegistrationFallback";

type Period = "today" | "tomorrow";

/** Ensure end is strictly after start (fallback: start + 1 hour). Returns ISO-like strings. */
const normalizeRange = (startTime: string, endTime: string): { startTime: string; endTime: string } => {
  const s = new Date(startTime);
  const e = new Date(endTime);
  if (Number.isNaN(s.getTime())) return { startTime, endTime };
  if (Number.isNaN(e.getTime()) || e.getTime() <= s.getTime()) {
    return { startTime, endTime: new Date(s.getTime() + 60 * 60 * 1000).toISOString() };
  }
  return { startTime, endTime };
};

type OpportunityWithOrg = Tables<"opportunities"> & { organization?: { name: string } | null };

const mapDbEvent = (e: Tables<"user_events">): RawEvent => ({
  id: e.id,
  title: e.title,
  ...normalizeRange(e.start_time, e.end_time),
  color: e.color,
  bg: e.bg,
  border: e.border,
  iconName: e.icon_name,
  badge: e.badge ?? undefined,
  category: e.category as CalendarCategory,
  description: e.description,
  registered: e.registered ?? false,
});

const groupTasks = (rows: Tables<"user_tasks">[]): Record<Period, Task[]> => {
  const today: Task[] = [];
  const tomorrow: Task[] = [];
  rows.forEach((t) => {
    const task: Task = { id: t.id, text: t.text, done: t.done };
    if (t.period === "tomorrow") tomorrow.push(task);
    else today.push(task);
  });
  return { today, tomorrow };
};

const errMsg = (e: unknown): string =>
  e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : "Something went wrong";

const notifyError = (title: string, e: unknown) =>
  toast({ title, description: errMsg(e), variant: "destructive" });

/** Convert an NGO opportunity into a RawEvent for the calendar */
const mapOpportunityToEvent = (opp: OpportunityWithOrg, isRegistered: boolean): RawEvent => {
  const range = normalizeRange(
    `${opp.date}T${opp.start_time || "09:00:00"}`,
    `${opp.date}T${opp.end_time || "17:00:00"}`
  );

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
    ...range,
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
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rawEvents, setRawEvents] = useState<RawEvent[]>([]);
  const [oppEvents, setOppEvents] = useState<RawEvent[]>([]);
  // Track registration state for static events separately
  const [staticRegistrations, setStaticRegistrations] = useState<Set<string>>(new Set());
  const [tasks, setTasks] = useState<Record<Period, Task[]>>({ today: [], tomorrow: [] });

  // One in-flight seed per (kind,user) so effect re-runs never double-seed.
  const seedRefs = useRef<Map<string, Promise<unknown[]>>>(new Map());

  useEffect(() => {
    let ignore = false;
    supabase.auth
      .getUser()
      .then(({ data: { user } }) => {
        if (ignore) return;
        setUserId(user?.id ?? null);
        setAuthChecked(true);
      })
      .catch(() => {
        if (ignore) return;
        setUserId(null);
        setAuthChecked(true);
      });
    return () => { ignore = true; };
  }, []);

  // Fetch registrations for static opportunities
  useEffect(() => {
    if (!userId) return;
    let ignore = false;
    (async () => {
      try {
        const staticIds = await fetchPersistedStaticRegistrationIds(userId);
        if (!ignore) setStaticRegistrations(staticIds);
      } catch {
        if (!ignore) setStaticRegistrations(new Set());
      }
    })();
    return () => { ignore = true; };
  }, [userId]);

  // Fetch NGO opportunities and convert to calendar events
  useEffect(() => {
    if (!authChecked) return;
    let ignore = false;
    const fetchOpportunities = async () => {
      const { data: opps, error: oppErr } = await supabase
        .from("opportunities")
        .select("*")
        .eq("status", "open")
        .order("date", { ascending: true });
      if (ignore) return;
      if (oppErr) {
        setError(oppErr.message);
        setOppEvents([]);
        return;
      }
      if (!opps || opps.length === 0) {
        setOppEvents([]);
        return;
      }

      const orgIds = [...new Set(opps.map((o) => o.org_id))];
      const { data: orgs, error: orgErr } = await supabase.from("organizations").select("id, name").in("id", orgIds);
      if (ignore) return;
      if (orgErr) console.error("Error fetching organizations:", orgErr);

      // Batch fetch registrations instead of N+1 queries
      let registeredOppIds = new Set<string>();
      if (userId) {
        const oppIds = opps.map((o) => o.id);
        const { data: regs, error: regErr } = await supabase
          .from("volunteer_registrations")
          .select("opportunity_id")
          .eq("user_id", userId)
          .in("opportunity_id", oppIds);
        if (ignore) return;
        if (regErr) console.error("Error fetching registrations:", regErr);
        if (regs) {
          registeredOppIds = new Set(regs.map((r) => r.opportunity_id));
        }
      }

      const orgMap = new Map<string, { id: string; name: string }>((orgs || []).map((o) => [o.id, o]));
      setOppEvents(
        opps.map((o) =>
          mapOpportunityToEvent({ ...o, organization: orgMap.get(o.org_id) }, registeredOppIds.has(o.id))
        )
      );
    };

    fetchOpportunities().catch((e) => { if (!ignore) setError(errMsg(e)); });
    return () => { ignore = true; };
  }, [userId, authChecked]);

  // Run a seed at most once per key even if the effect re-runs concurrently.
  const seedOnce = useCallback((key: string, run: () => Promise<unknown[]>) => {
    let p = seedRefs.current.get(key);
    if (!p) {
      p = run().catch((e) => {
        seedRefs.current.delete(key); // allow retry after failure
        throw e;
      });
      seedRefs.current.set(key, p);
    }
    return p;
  }, []);

  useEffect(() => {
    if (!authChecked) return;
    if (!userId) {
      setRawEvents(initialEvents);
      setTasks(initialTasks);
      setError(null);
      setDataLoading(false);
      return;
    }

    let ignore = false;

    const seedEvents = async (uid: string) => {
      const rows: TablesInsert<"user_events">[] = initialEvents.map((e) => ({
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
      const { data, error: insErr } = await supabase.from("user_events").insert(rows).select();
      if (insErr) throw insErr;
      return data || [];
    };

    const seedTasks = async (uid: string) => {
      const rows: TablesInsert<"user_tasks">[] = [
        ...initialTasks.today.map((t) => ({ user_id: uid, text: t.text, done: t.done, period: "today" })),
        ...initialTasks.tomorrow.map((t) => ({ user_id: uid, text: t.text, done: t.done, period: "tomorrow" })),
      ];
      const { data, error: insErr } = await supabase.from("user_tasks").insert(rows).select();
      if (insErr) throw insErr;
      return data || [];
    };

    const fetchAll = async () => {
      setDataLoading(true);
      setError(null);
      try {
        const { data: evData, error: evErr } = await supabase
          .from("user_events")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: true });
        if (ignore) return;
        if (evErr) throw evErr;

        if (evData && evData.length > 0) {
          setRawEvents(evData.map(mapDbEvent));
        } else {
          const seeded = await seedOnce(`events:${userId}`, () => seedEvents(userId));
          if (ignore) return;
          setRawEvents((seeded as Tables<"user_events">[]).map(mapDbEvent));
        }

        const { data: taskData, error: taskErr } = await supabase
          .from("user_tasks")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: true });
        if (ignore) return;
        if (taskErr) throw taskErr;

        if (taskData && taskData.length > 0) {
          setTasks(groupTasks(taskData));
        } else {
          const seeded = await seedOnce(`tasks:${userId}`, () => seedTasks(userId));
          if (ignore) return;
          setTasks(groupTasks(seeded as Tables<"user_tasks">[]));
        }
      } catch (e) {
        if (ignore) return;
        console.error("Error loading schedule:", e);
        setError(errMsg(e));
      } finally {
        if (!ignore) setDataLoading(false);
      }
    };

    fetchAll();
    return () => { ignore = true; };
  }, [userId, authChecked, seedOnce]);

  const loading = !authChecked || dataLoading;

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
        ...normalizeRange(`${o.date}T${o.startTime}`, `${o.date}T${o.endTime}`),
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

  const toggleTask = useCallback(async (period: Period, id: string) => {
    const task = tasks[period].find((t) => t.id === id);
    if (!task) return;
    const nextDone = !task.done;
    const setDone = (done: boolean) =>
      setTasks((prev) => ({
        ...prev,
        [period]: prev[period].map((t) => (t.id === id ? { ...t, done } : t)),
      }));
    setDone(nextDone);
    if (userId) {
      const { error: upErr } = await supabase
        .from("user_tasks")
        .update({ done: nextDone })
        .eq("id", id)
        .eq("user_id", userId);
      if (upErr) {
        setDone(task.done);
        notifyError("Couldn't update task", upErr);
      }
    }
  }, [tasks, userId]);

  const addTask = useCallback(async (period: Period, text: string) => {
    if (!text.trim()) return;
    if (!userId) {
      const newTask: Task = { id: `t-${Date.now()}`, text: text.trim(), done: false };
      setTasks((prev) => ({ ...prev, [period]: [...prev[period], newTask] }));
      return;
    }
    const { data, error: insErr } = await supabase
      .from("user_tasks")
      .insert({ user_id: userId, text: text.trim(), done: false, period })
      .select()
      .single();
    if (insErr || !data) {
      notifyError("Couldn't add task", insErr);
      return;
    }
    const newTask: Task = { id: data.id, text: data.text, done: data.done };
    setTasks((prev) => ({ ...prev, [period]: [...prev[period], newTask] }));
  }, [userId]);

  const editTask = useCallback(async (period: Period, id: string, newText: string) => {
    const trimmed = newText.trim();
    if (!trimmed) return;
    const old = tasks[period].find((t) => t.id === id);
    const setText = (text: string) =>
      setTasks((prev) => ({
        ...prev,
        [period]: prev[period].map((t) => (t.id === id ? { ...t, text } : t)),
      }));
    setText(trimmed);
    if (userId) {
      const { error: upErr } = await supabase
        .from("user_tasks")
        .update({ text: trimmed })
        .eq("id", id)
        .eq("user_id", userId);
      if (upErr) {
        if (old) setText(old.text);
        notifyError("Couldn't edit task", upErr);
      }
    }
  }, [tasks, userId]);

  const deleteTask = useCallback(async (period: Period, id: string) => {
    const old = tasks[period].find((t) => t.id === id);
    const oldIndex = tasks[period].findIndex((t) => t.id === id);
    setTasks((prev) => ({ ...prev, [period]: prev[period].filter((t) => t.id !== id) }));
    if (userId) {
      const { error: delErr } = await supabase
        .from("user_tasks")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);
      if (delErr) {
        if (old) {
          setTasks((prev) => {
            const list = prev[period].filter((t) => t.id !== id);
            list.splice(Math.min(Math.max(oldIndex, 0), list.length), 0, old);
            return { ...prev, [period]: list };
          });
        }
        notifyError("Couldn't delete task", delErr);
      }
    }
  }, [tasks, userId]);

  const deleteEvent = useCallback(async (id: string) => {
    const old = rawEvents.find((e) => e.id === id);
    setRawEvents((prev) => prev.filter((e) => e.id !== id));
    if (userId) {
      const { error: delErr } = await supabase
        .from("user_events")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);
      if (delErr) {
        if (old) setRawEvents((prev) => [...prev, old]);
        notifyError("Couldn't delete event", delErr);
      }
    }
  }, [userId, rawEvents]);

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
      try {
        if (wasRegistered) {
          await removeStaticRegistration(userId, staticId);
        } else {
          await upsertStaticRegistration(userId, staticId);
        }
      } catch (e) {
        setStaticRegistrations((prev) => {
          const next = new Set(prev);
          if (wasRegistered) next.add(staticId);
          else next.delete(staticId);
          return next;
        });
        notifyError("Couldn't update registration", e);
        return wasRegistered;
      }
      queryClient.invalidateQueries({ queryKey: ["my-registrations"] });
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
      const { error: regErr } = event.registered
        ? await supabase.from("volunteer_registrations").delete().eq("opportunity_id", oppId).eq("user_id", userId)
        : await supabase.from("volunteer_registrations").insert({ opportunity_id: oppId, user_id: userId });
      if (regErr) {
        setOppEvents((prev) => prev.map((e) => e.id === id ? { ...e, registered: event.registered } : e));
        notifyError("Couldn't update registration", regErr);
        return event.registered;
      }
      queryClient.invalidateQueries({ queryKey: ["my-registrations"] });
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
      const { error: upErr } = await supabase
        .from("user_events")
        .update({ registered: newState })
        .eq("id", id)
        .eq("user_id", userId);
      if (upErr) {
        setRawEvents((prev) => prev.map((e) => e.id === id ? { ...e, registered: event.registered } : e));
        notifyError("Couldn't update registration", upErr);
        return event.registered;
      }
    }
    return newState;
  }, [userId, rawEvents, oppEvents, staticRegistrations, queryClient]);

  const changeCategory = useCallback(async (id: string, newCategory: string) => {
    const old = rawEvents.find((e) => e.id === id);
    if (!old) return; // only user-owned events are editable
    setRawEvents((prev) =>
      prev.map((e) => e.id === id ? { ...e, category: newCategory as CalendarCategory } : e)
    );
    if (userId) {
      const { error: upErr } = await supabase
        .from("user_events")
        .update({ category: newCategory })
        .eq("id", id)
        .eq("user_id", userId);
      if (upErr) {
        setRawEvents((prev) => prev.map((e) => e.id === id ? { ...e, category: old.category } : e));
        notifyError("Couldn't change category", upErr);
      }
    }
  }, [userId, rawEvents]);

  return {
    loading,
    error,
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
