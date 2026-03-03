import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { CalendarCategory, Task } from "@/components/schedule/types";
import type { RawEvent } from "@/components/schedule/data";
import { initialEvents, initialTasks } from "@/components/schedule/data";

export function useScheduleData() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Events
  const [rawEvents, setRawEvents] = useState<RawEvent[]>([]);
  // Tasks
  const [tasks, setTasks] = useState<Record<"today" | "tomorrow", Task[]>>({ today: [], tomorrow: [] });

  // Get current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id ?? null);
    });
  }, []);

  // Fetch data when userId is available
  useEffect(() => {
    if (!userId) {
      // Not logged in — use local defaults
      setRawEvents(initialEvents);
      setTasks(initialTasks);
      setLoading(false);
      return;
    }

    const fetchAll = async () => {
      setLoading(true);

      // Fetch events
      const { data: evData } = await supabase
        .from("user_events")
        .select("*")
        .order("created_at", { ascending: true });

      if (evData && evData.length > 0) {
        setRawEvents(
          evData.map((e: any) => ({
            id: e.id,
            title: e.title,
            day: e.day,
            startHour: e.start_hour,
            startMin: e.start_min,
            endHour: e.end_hour,
            endMin: e.end_min,
            color: e.color,
            bg: e.bg,
            border: e.border,
            iconName: e.icon_name,
            badge: e.badge ?? undefined,
            category: e.category as CalendarCategory,
            description: e.description,
          }))
        );
      } else if (evData && evData.length === 0) {
        // First time user — seed with defaults
        await seedEvents(userId);
      }

      // Fetch tasks
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

  // Seed default events for new users
  const seedEvents = async (uid: string) => {
    const rows = initialEvents.map((e) => ({
      user_id: uid,
      title: e.title,
      day: e.day,
      start_hour: e.startHour,
      start_min: e.startMin,
      end_hour: e.endHour,
      end_min: e.endMin,
      color: e.color,
      bg: e.bg,
      border: e.border,
      icon_name: e.iconName,
      badge: e.badge ?? null,
      category: e.category,
      description: e.description,
    }));
    const { data } = await supabase.from("user_events").insert(rows).select();
    if (data) {
      setRawEvents(
        data.map((e: any) => ({
          id: e.id,
          title: e.title,
          day: e.day,
          startHour: e.start_hour,
          startMin: e.start_min,
          endHour: e.end_hour,
          endMin: e.end_min,
          color: e.color,
          bg: e.bg,
          border: e.border,
          iconName: e.icon_name,
          badge: e.badge ?? undefined,
          category: e.category as CalendarCategory,
          description: e.description,
        }))
      );
    }
  };

  // Seed default tasks for new users
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

  // ─── Task operations ─────────────────────
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
      // Local-only fallback
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

  // ─── Event operations ─────────────────────
  const deleteEvent = useCallback(async (id: string) => {
    setRawEvents((prev) => prev.filter((e) => e.id !== id));
    if (userId) {
      await supabase.from("user_events").delete().eq("id", id);
    }
  }, [userId]);

  return {
    loading,
    userId,
    rawEvents,
    tasks,
    toggleTask,
    addTask,
    editTask,
    deleteTask,
    deleteEvent,
  };
}
