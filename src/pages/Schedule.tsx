import { useState, useEffect } from "react";
import {
  Home,
  CalendarDays,
  MessageSquare,
  Settings,
  Search,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  Circle,
  MapPin,
  Clock,
  TreePine,
  Utensils,
  Users,
  Waves,
  Bus,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useNavigate } from "react-router-dom";

// ─── helpers ───────────────────────────────────────────────────────
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = Array.from({ length: 12 }, (_, i) => i + 8); // 08 – 19

const pad = (n: number) => String(n).padStart(2, "0");

// mini-calendar util
const buildMiniCal = (year: number, month: number) => {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startDay = (first.getDay() + 6) % 7; // Mon=0
  const days: (number | null)[] = Array(startDay).fill(null);
  for (let d = 1; d <= last.getDate(); d++) days.push(d);
  while (days.length % 7 !== 0) days.push(null);
  return days;
};

// ─── types ─────────────────────────────────────────────────────────
interface CalEvent {
  title: string;
  day: number; // 0=Mon
  startHour: number;
  startMin: number;
  endHour: number;
  endMin: number;
  color: string; // tailwind-friendly
  bg: string;
  border: string;
  icon: React.ReactNode;
  badge?: string;
}

const events: CalEvent[] = [
  {
    title: "Beach Cleanup",
    day: 0,
    startHour: 9,
    startMin: 0,
    endHour: 11,
    endMin: 30,
    color: "text-sky-300",
    bg: "bg-sky-500/15",
    border: "border-l-sky-400",
    icon: <Waves className="w-3.5 h-3.5" />,
  },
  {
    title: "Mentorship Session",
    day: 1,
    startHour: 13,
    startMin: 30,
    endHour: 15,
    endMin: 0,
    color: "text-amber-300",
    bg: "bg-amber-500/15",
    border: "border-l-amber-400",
    icon: <Users className="w-3.5 h-3.5" />,
    badge: "AI Suggested Match",
  },
  {
    title: "Food Drive Sorting",
    day: 2,
    startHour: 11,
    startMin: 30,
    endHour: 13,
    endMin: 0,
    color: "text-pink-300",
    bg: "bg-pink-500/15",
    border: "border-l-pink-400",
    icon: <Utensils className="w-3.5 h-3.5" />,
  },
  {
    title: "Tree Plantation Briefing",
    day: 3,
    startHour: 8,
    startMin: 0,
    endHour: 9,
    endMin: 30,
    color: "text-emerald-300",
    bg: "bg-emerald-500/15",
    border: "border-l-emerald-400",
    icon: <TreePine className="w-3.5 h-3.5" />,
  },
  {
    title: "Travel to Palghar Camp",
    day: 4,
    startHour: 16,
    startMin: 0,
    endHour: 19,
    endMin: 0,
    color: "text-violet-300",
    bg: "bg-violet-500/15",
    border: "border-l-violet-400",
    icon: <Bus className="w-3.5 h-3.5" />,
  },
];

// ─── tasks ─────────────────────────────────────────────────────────
const tasks = {
  today: [
    { text: "Call NGO coordinator", done: false },
    { text: "Pack supplies for beach cleanup", done: true },
    { text: "Submit NSS report", done: false },
  ],
  tomorrow: [
    { text: "Confirm mentorship session", done: false },
    { text: "Prepare food drive inventory", done: false },
  ],
};

// ─── calendar toggles ─────────────────────────────────────────────
const calendars = [
  { label: "Personal Calendar", color: "bg-sky-400" },
  { label: "SocioSquad Events", color: "bg-amber-400" },
  { label: "NSS Camps", color: "bg-emerald-400" },
  { label: "Urgent Relief", color: "bg-rose-400" },
];

// ═══════════════════════════════════════════════════════════════════
const Schedule = () => {
  const navigate = useNavigate();
  const now = new Date();
  const [currentTime, setCurrentTime] = useState(now);
  const [calToggles, setCalToggles] = useState<Record<string, boolean>>(
    Object.fromEntries(calendars.map((c) => [c.label, true]))
  );
  const [view, setView] = useState<"Week" | "Month">("Week");
  const [miniMonth, setMiniMonth] = useState(now.getMonth());
  const [miniYear, setMiniYear] = useState(now.getFullYear());

  useEffect(() => {
    const id = setInterval(() => setCurrentTime(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const miniDays = buildMiniCal(miniYear, miniMonth);
  const monthName = new Date(miniYear, miniMonth).toLocaleString("default", { month: "long" });

  const currentHour = currentTime.getHours();
  const currentMin = currentTime.getMinutes();
  const timeInRange = currentHour >= 8 && currentHour < 19;

  return (
    <div className="flex h-screen w-full overflow-hidden" style={{ backgroundColor: "#0f0a1c" }}>
      {/* ── Icon rail ───────────────────────────────────── */}
      <nav className="w-[56px] shrink-0 flex flex-col items-center py-6 gap-6 border-r" style={{ borderColor: "#2a2438" }}>
        <button onClick={() => navigate("/")} className="p-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors">
          <Home className="w-5 h-5" />
        </button>
        <button className="p-2.5 rounded-xl bg-primary/20 text-primary transition-colors">
          <CalendarDays className="w-5 h-5" />
        </button>
        <button className="p-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors">
          <MessageSquare className="w-5 h-5" />
        </button>
        <div className="flex-1" />
        <button className="p-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors">
          <Settings className="w-5 h-5" />
        </button>
      </nav>

      {/* ── Left sidebar ────────────────────────────────── */}
      <aside className="w-[260px] shrink-0 border-r flex flex-col overflow-y-auto" style={{ borderColor: "#2a2438" }}>
        {/* Search */}
        <div className="p-4">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary/50 border border-border/50">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search events…"
              className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none w-full"
            />
          </div>
        </div>

        {/* Mini calendar */}
        <div className="px-4 pb-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-foreground">
              {monthName} {miniYear}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => {
                  if (miniMonth === 0) { setMiniMonth(11); setMiniYear(miniYear - 1); } else setMiniMonth(miniMonth - 1);
                }}
                className="p-1 rounded-md hover:bg-secondary/60 text-muted-foreground"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  if (miniMonth === 11) { setMiniMonth(0); setMiniYear(miniYear + 1); } else setMiniMonth(miniMonth + 1);
                }}
                className="p-1 rounded-md hover:bg-secondary/60 text-muted-foreground"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 text-center text-[11px] text-muted-foreground mb-1">
            {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
              <span key={i} className="py-1">{d}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 text-center text-xs">
            {miniDays.map((d, i) => {
              const isToday = d === now.getDate() && miniMonth === now.getMonth() && miniYear === now.getFullYear();
              return (
                <span
                  key={i}
                  className={`py-1.5 rounded-lg cursor-pointer transition-colors ${
                    d === null
                      ? ""
                      : isToday
                      ? "bg-primary text-primary-foreground font-bold"
                      : "text-foreground/70 hover:bg-secondary/60"
                  }`}
                >
                  {d ?? ""}
                </span>
              );
            })}
          </div>
        </div>

        <div className="h-px mx-4" style={{ backgroundColor: "#2a2438" }} />

        {/* My Calendars */}
        <div className="p-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">My Calendars</h3>
          <div className="space-y-3">
            {calendars.map((cal) => (
              <label key={cal.label} className="flex items-center gap-3 cursor-pointer group">
                <Switch
                  checked={calToggles[cal.label]}
                  onCheckedChange={(v) => setCalToggles((s) => ({ ...s, [cal.label]: v }))}
                  className="data-[state=checked]:bg-primary scale-75"
                />
                <span className={`w-2.5 h-2.5 rounded-full ${cal.color}`} />
                <span className="text-sm text-foreground/80 group-hover:text-foreground transition-colors">{cal.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="h-px mx-4" style={{ backgroundColor: "#2a2438" }} />

        {/* Upcoming Tasks */}
        <div className="p-4 flex-1">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Upcoming Tasks</h3>

          {(["today", "tomorrow"] as const).map((period) => (
            <div key={period} className="mb-4">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{period}</span>
              <div className="mt-2 space-y-2">
                {tasks[period].map((t, i) => (
                  <div key={i} className="flex items-start gap-2.5 group">
                    {t.done ? (
                      <CheckCircle2 className="w-4 h-4 text-cyan shrink-0 mt-0.5" />
                    ) : (
                      <Circle className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5 group-hover:text-cyan transition-colors" />
                    )}
                    <span className={`text-sm leading-snug ${t.done ? "line-through text-muted-foreground" : "text-foreground/80"}`}>
                      {t.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* ── Main calendar ───────────────────────────────── */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="shrink-0 flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "#2a2438" }}>
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-foreground">
              {now.toLocaleString("default", { month: "long" })} {now.getFullYear()}
            </h1>
            <button className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 transition-colors">
              Today
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex rounded-lg overflow-hidden border border-border/50">
              {(["Week", "Month"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`text-xs font-semibold px-4 py-1.5 transition-colors ${
                    view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border/50">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-medium text-foreground/80">Availability</span>
            </div>
          </div>
        </header>

        {/* Grid */}
        <div className="flex-1 overflow-auto relative">
          <div className="grid min-w-[800px]" style={{ gridTemplateColumns: "60px repeat(7, 1fr)" }}>
            {/* Day headers */}
            <div className="sticky top-0 z-10" style={{ backgroundColor: "#0f0a1c" }} />
            {DAYS.map((d, i) => (
              <div
                key={d}
                className="sticky top-0 z-10 py-3 text-center text-xs font-semibold text-muted-foreground border-b"
                style={{ backgroundColor: "#0f0a1c", borderColor: "#2a2438" }}
              >
                {d}
              </div>
            ))}

            {/* Time rows */}
            {HOURS.map((h) => (
              <>
                {/* Hour label */}
                <div
                  key={`label-${h}`}
                  className="relative text-[11px] text-muted-foreground text-right pr-3 border-r"
                  style={{ height: 80, borderColor: "#2a2438" }}
                >
                  <span className="absolute -top-2 right-3">{pad(h)}:00</span>
                </div>

                {/* Day cells */}
                {DAYS.map((_, di) => (
                  <div
                    key={`cell-${h}-${di}`}
                    className="relative border-b border-r"
                    style={{ height: 80, borderColor: "#2a2438" }}
                  >
                    {/* Half-hour dotted line */}
                    <div className="absolute inset-x-0 top-1/2 border-t border-dotted" style={{ borderColor: "#1e1730" }} />
                  </div>
                ))}
              </>
            ))}
          </div>

          {/* ── Event blocks (positioned absolutely) ───── */}
          <div className="absolute inset-0 pointer-events-none" style={{ paddingLeft: 60 }}>
            <div className="relative h-full w-full" style={{ minWidth: "calc(800px - 60px)" }}>
              {events.map((ev, idx) => {
                const totalMinStart = (ev.startHour - 8) * 80 + (ev.startMin / 60) * 80;
                const totalMinEnd = (ev.endHour - 8) * 80 + (ev.endMin / 60) * 80;
                const height = totalMinEnd - totalMinStart;
                // +36px for header row
                const top = totalMinStart + 36;
                const colWidth = 100 / 7;
                const left = `${ev.day * colWidth}%`;
                const width = `${colWidth}%`;

                return (
                  <div
                    key={idx}
                    className={`absolute pointer-events-auto cursor-pointer rounded-lg ${ev.bg} border-l-[3px] ${ev.border} backdrop-blur-sm px-2.5 py-2 transition-all duration-200 hover:scale-[1.02] hover:brightness-125`}
                    style={{ top, left, width, height, paddingRight: 8 }}
                  >
                    <div className={`flex items-center gap-1.5 ${ev.color} mb-0.5`}>
                      {ev.icon}
                      <span className="text-[11px] font-bold truncate">{ev.title}</span>
                    </div>
                    <span className="text-[10px] text-foreground/50 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {pad(ev.startHour)}:{pad(ev.startMin)} – {pad(ev.endHour)}:{pad(ev.endMin)}
                    </span>
                    {ev.badge && (
                      <span className="mt-1 inline-flex items-center gap-1 text-[9px] font-semibold text-amber-300 bg-amber-400/10 px-1.5 py-0.5 rounded-full">
                        <Sparkles className="w-3 h-3" /> {ev.badge}
                      </span>
                    )}
                  </div>
                );
              })}

              {/* Current time indicator */}
              {timeInRange && (
                <div
                  className="absolute left-0 right-0 flex items-center z-20 pointer-events-none"
                  style={{ top: (currentHour - 8) * 80 + (currentMin / 60) * 80 + 36 }}
                >
                  <span className="shrink-0 -ml-[60px] w-[60px] text-center text-[10px] font-bold text-neon-purple bg-neon-purple/20 rounded-md px-1.5 py-0.5">
                    {pad(currentHour)}:{pad(currentMin)}
                  </span>
                  <div className="flex-1 h-[2px] bg-neon-purple shadow-glow-purple" />
                  <div className="w-2.5 h-2.5 rounded-full bg-neon-purple shadow-glow-purple -ml-1" />
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Schedule;
