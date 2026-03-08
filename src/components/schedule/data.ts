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
  day: number;
  startHour: number;
  startMin: number;
  endHour: number;
  endMin: number;
  color: string;
  bg: string;
  border: string;
  iconName: "Waves" | "Users" | "Utensils" | "TreePine" | "Bus";
  badge?: string;
  category: CalendarCategory;
  description: string;
}

export const initialEvents: RawEvent[] = [
  {
    id: "e1",
    title: "Beach Cleanup",
    day: 0,
    startHour: 9, startMin: 0, endHour: 11, endMin: 30,
    color: "text-sky-700", bg: "bg-sky-100", border: "border-l-sky-500",
    iconName: "Waves",
    category: "Personal Calendar",
    description: "Join us for a community beach cleanup drive along Juhu Beach. Bring gloves and water bottles.",
  },
  {
    id: "e2",
    title: "Mentorship Session",
    day: 1,
    startHour: 13, startMin: 30, endHour: 15, endMin: 0,
    color: "text-amber-700", bg: "bg-amber-100", border: "border-l-amber-500",
    iconName: "Users",
    badge: "Skills Match ✨",
    category: "SocioSquad Events",
    description: "One-on-one mentorship session with a local student. Matched based on your skills.",
  },
  {
    id: "e3",
    title: "Food Drive Sorting",
    day: 2,
    startHour: 11, startMin: 30, endHour: 13, endMin: 0,
    color: "text-rose-700", bg: "bg-rose-100", border: "border-l-rose-500",
    iconName: "Utensils",
    category: "Urgent Relief",
    description: "Help sort and package food items for distribution to underprivileged communities.",
  },
  {
    id: "e4",
    title: "Tree Plantation Briefing",
    day: 3,
    startHour: 8, startMin: 0, endHour: 9, endMin: 30,
    color: "text-emerald-700", bg: "bg-emerald-100", border: "border-l-emerald-500",
    iconName: "TreePine",
    category: "NSS Camps",
    description: "Pre-event briefing for the upcoming tree plantation drive at Aarey Colony.",
  },
  {
    id: "e5",
    title: "Travel to Palghar Camp",
    day: 4,
    startHour: 16, startMin: 0, endHour: 19, endMin: 0,
    color: "text-violet-700", bg: "bg-violet-100", border: "border-l-violet-500",
    iconName: "Bus",
    category: "NSS Camps",
    description: "Bus travel to the 7-day NSS camp at Palghar. Meet at college gate by 3:45 PM.",
  },
];
