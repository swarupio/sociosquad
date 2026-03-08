import type { CalendarCategory, CalendarToggle, Task } from "./types";

// Re-export for convenience
export type { CalEvent } from "./types";

export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const HOURS = Array.from({ length: 12 }, (_, i) => i + 8); // 08–19

export const pad = (n: number) => String(n).padStart(2, "0");

export const buildMiniCal = (year: number, month: number) => {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startDay = (first.getDay() + 6) % 7;
  const days: (number | null)[] = Array(startDay).fill(null);
  for (let d = 1; d <= last.getDate(); d++) days.push(d);
  while (days.length % 7 !== 0) days.push(null);
  return days;
};

export const calendars: CalendarToggle[] = [
  { label: "Personal Calendar", color: "bg-sky-400" },
  { label: "SocioSquad Events", color: "bg-amber-400" },
  { label: "NSS Camps", color: "bg-emerald-400" },
  { label: "Urgent Relief", color: "bg-rose-400" },
];

export const initialTasks: Record<"today" | "tomorrow", Task[]> = {
  today: [
    { id: "t1", text: "Call NGO coordinator", done: false },
    { id: "t2", text: "Pack supplies for beach cleanup", done: true },
    { id: "t3", text: "Submit NSS report", done: false },
  ],
  tomorrow: [
    { id: "t4", text: "Confirm mentorship session", done: false },
    { id: "t5", text: "Prepare food drive inventory", done: false },
  ],
};

// Raw event data without icons (icons added in the component)
export interface RawEvent {
  id: string;
  title: string;
  startTime: string; // ISO date string
  endTime: string;   // ISO date string
  color: string;
  bg: string;
  border: string;
  iconName: string;
  badge?: string;
  category: CalendarCategory;
  description: string;
  registered: boolean;
}

export const initialEvents: RawEvent[] = [
  {
    id: "1",
    title: "Beach Cleanup",
    startTime: "2026-03-09T09:00:00",
    endTime: "2026-03-09T11:30:00",
    color: "text-blue-900",
    bg: "bg-blue-100",
    border: "border-l-blue-500",
    iconName: "Waves",
    category: "SocioSquad Events",
    description: "Join us for a community beach cleanup drive along Juhu Beach. Bring gloves and water bottles.",
    registered: false,
  },
  {
    id: "2",
    title: "Tree Plantation Briefing",
    startTime: "2026-03-12T08:00:00",
    endTime: "2026-03-12T09:30:00",
    color: "text-emerald-900",
    bg: "bg-emerald-100",
    border: "border-l-emerald-500",
    iconName: "TreePine",
    category: "NSS Camps",
    description: "Pre-event briefing for the upcoming tree plantation drive at Aarey Colony.",
    registered: false,
  },
  {
    id: "3",
    title: "Food Drive Sorting",
    startTime: "2026-03-18T11:30:00",
    endTime: "2026-03-18T13:00:00",
    color: "text-pink-900",
    bg: "bg-pink-100",
    border: "border-l-pink-500",
    iconName: "Utensils",
    category: "SocioSquad Events",
    description: "Help sort and package food items for distribution to underprivileged communities.",
    registered: false,
  },
  {
    id: "4",
    title: "Mentorship Session ✨",
    startTime: "2026-03-24T13:30:00",
    endTime: "2026-03-24T15:00:00",
    color: "text-yellow-900",
    bg: "bg-yellow-100",
    border: "border-l-yellow-500",
    iconName: "Users",
    badge: "Skills Match ✨",
    category: "Personal Calendar",
    description: "Skills Match. Mentoring high school students.",
    registered: false,
  },
  {
    id: "5",
    title: "Travel to Palghar Camp",
    startTime: "2026-04-03T16:00:00",
    endTime: "2026-04-03T19:00:00",
    color: "text-teal-900",
    bg: "bg-teal-100",
    border: "border-l-teal-500",
    iconName: "Bus",
    category: "NSS Camps",
    description: "Annual NSS Camp preparation and travel.",
    registered: false,
  },
  {
    id: "6",
    title: "Emergency Blood Donation",
    startTime: "2026-04-10T10:00:00",
    endTime: "2026-04-10T12:00:00",
    color: "text-red-900",
    bg: "bg-red-100",
    border: "border-l-red-500",
    iconName: "Users",
    category: "Urgent Relief",
    description: "Urgent requirement at City Hospital.",
    registered: false,
  },
];

/** Get the Monday of the week containing the given date */
export const getWeekStart = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

/** Format time from a Date object */
export const formatTime = (date: Date): string =>
  `${pad(date.getHours())}:${pad(date.getMinutes())}`;
