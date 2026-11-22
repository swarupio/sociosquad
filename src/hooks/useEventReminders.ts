import { useEffect } from "react";
import {
  hasFired,
  markFired,
  reminderBody,
  reminderSchedule,
  type ReminderEvent,
} from "@/lib/notifications";

const supported = () => typeof window !== "undefined" && "Notification" in window;

export function reminderPermission(): NotificationPermission | "unsupported" {
  return supported() ? Notification.permission : "unsupported";
}

/** Ask for browser notification permission (must be called from a user gesture). */
export async function requestReminderPermission(): Promise<NotificationPermission | "unsupported"> {
  if (!supported()) return "unsupported";
  if (Notification.permission !== "default") return Notification.permission;
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

/**
 * Schedule browser notifications (24h and 1h before) for upcoming registered events,
 * within a 48h horizon. Only active when permission is granted.
 */
export function useEventReminders(events: ReminderEvent[] | undefined, offsetsMinutes: number[] = [1440, 60]) {
  const signature = (events ?? []).map((e) => `${e.id}|${e.date}|${e.start_time ?? ""}`).join(",");
  const offsetsKey = offsetsMinutes.join(",");

  useEffect(() => {
    if (!supported() || Notification.permission !== "granted" || !events?.length) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const now = new Date();
    for (const r of reminderSchedule(events, now, offsetsKey.split(",").map(Number))) {
      if (hasFired(r.key)) continue;
      const delay = r.at - now.getTime();
      timers.push(
        setTimeout(() => {
          if (Notification.permission !== "granted" || hasFired(r.key)) return;
          markFired(r.key);
          try {
            new Notification(r.title, { body: reminderBody(r.offsetMinutes), tag: r.key });
          } catch {
            /* some mobile browsers require a service worker; ignore */
          }
        }, delay),
      );
    }
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, offsetsKey]);
}
