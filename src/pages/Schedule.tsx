import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Home, CalendarDays, MessageSquare, Settings,
  ChevronLeft, ChevronRight, Sparkles, Clock,
  TreePine, Utensils, Users, Waves, Bus, Loader2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import EventDetailModal from "@/components/schedule/EventDetailModal";
import ScheduleSidebar from "@/components/schedule/ScheduleSidebar";
import type { CalEvent, CalendarCategory } from "@/components/schedule/types";
import { DAYS, HOURS, pad } from "@/components/schedule/data";
import { useScheduleData } from "@/hooks/useScheduleData";

const iconMap: Record<string, React.ReactNode> = {
  Waves: <Waves className="w-3.5 h-3.5" />,
  Users: <Users className="w-3.5 h-3.5" />,
  Utensils: <Utensils className="w-3.5 h-3.5" />,
  TreePine: <TreePine className="w-3.5 h-3.5" />,
  Bus: <Bus className="w-3.5 h-3.5" />,
};

const Schedule = () => {
  const navigate = useNavigate();
  const now = new Date();
  const [currentTime, setCurrentTime] = useState(now);
  const [view, setView] = useState<"Week" | "Month">("Week");

  const [activeCategories, setActiveCategories] = useState<Record<CalendarCategory, boolean>>({
    "Personal Calendar": true, "SocioSquad Events": true, "NSS Camps": true, "Urgent Relief": true,
  });

  const {
    loading, rawEvents, tasks,
    toggleTask, addTask, editTask, deleteTask, deleteEvent,
  } = useScheduleData();

  const events: CalEvent[] = useMemo(
    () => rawEvents.map((e) => ({ ...e, icon: iconMap[e.iconName] })),
    [rawEvents]
  );

  const [selectedEvent, setSelectedEvent] = useState<CalEvent | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeDate, setActiveDate] = useState(new Date());

  const filteredEvents = useMemo(
    () => events.filter((ev) => activeCategories[ev.category]),
    [events, activeCategories]
  );

  useEffect(() => {
    const id = setInterval(() => setCurrentTime(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const currentHour = currentTime.getHours();
  const currentMin = currentTime.getMinutes();
  const timeInRange = currentHour >= 8 && currentHour < 19;

  const toggleCategory = useCallback((label: CalendarCategory) => {
    setActiveCategories((prev) => ({ ...prev, [label]: !prev[label] }));
  }, []);

  const resetToToday = useCallback(() => {
    setActiveDate(new Date());
  }, []);

  const openEventDetail = useCallback((ev: CalEvent) => {
    setSelectedEvent(ev);
    setModalOpen(true);
  }, []);

  return (
    <div className="flex h-screen w-full overflow-hidden" style={{ backgroundColor: "#0f0a1c" }}>
      {/* Icon rail */}
      <nav className="w-[56px] shrink-0 flex flex-col items-center py-6 gap-6 border-r" style={{ borderColor: "#2a2438" }}>
        <button onClick={() => navigate("/")} className="p-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"><Home className="w-5 h-5" /></button>
        <button className="p-2.5 rounded-xl bg-primary/20 text-primary transition-colors"><CalendarDays className="w-5 h-5" /></button>
        <button className="p-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"><MessageSquare className="w-5 h-5" /></button>
        <div className="flex-1" />
        <button className="p-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"><Settings className="w-5 h-5" /></button>
      </nav>

      {/* Sidebar */}
      <ScheduleSidebar
        activeDate={activeDate}
        onSelectDate={setActiveDate}
        activeCategories={activeCategories}
        onToggleCategory={toggleCategory}
        tasks={tasks}
        onToggleTask={toggleTask}
        onAddTask={addTask}
        onEditTask={editTask}
        onDeleteTask={deleteTask}
      />

      {/* Main calendar */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="shrink-0 flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "#2a2438" }}>
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-foreground">
              {activeDate.toLocaleString("default", { month: "long" })} {activeDate.getFullYear()}
            </h1>
            <button onClick={resetToToday} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 transition-colors">Today</button>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex rounded-lg overflow-hidden border border-border/50">
              {(["Week", "Month"] as const).map((v) => (
                <button key={v} onClick={() => setView(v)} className={`text-xs font-semibold px-4 py-1.5 transition-colors ${view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>{v}</button>
              ))}
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border/50">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-medium text-foreground/80">Availability</span>
            </div>
          </div>
        </header>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : view === "Month" ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-2">
              <CalendarDays className="w-12 h-12 text-muted-foreground mx-auto" />
              <p className="text-muted-foreground text-sm">Month view coming soon</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-auto relative">
            <div className="grid min-w-[800px]" style={{ gridTemplateColumns: "60px repeat(7, 1fr)" }}>
              <div className="sticky top-0 z-10" style={{ backgroundColor: "#0f0a1c" }} />
              {DAYS.map((d) => (
                <div key={d} className="sticky top-0 z-10 py-3 text-center text-xs font-semibold text-muted-foreground border-b" style={{ backgroundColor: "#0f0a1c", borderColor: "#2a2438" }}>{d}</div>
              ))}
              {HOURS.map((h) => (
                <div key={`row-${h}`} className="contents">
                  <div className="relative text-[11px] text-muted-foreground text-right pr-3 border-r" style={{ height: 80, borderColor: "#2a2438" }}>
                    <span className="absolute -top-2 right-3">{pad(h)}:00</span>
                  </div>
                  {DAYS.map((_, di) => (
                    <div key={`cell-${h}-${di}`} className="relative border-b border-r" style={{ height: 80, borderColor: "#2a2438" }}>
                      <div className="absolute inset-x-0 top-1/2 border-t border-dotted" style={{ borderColor: "#1e1730" }} />
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <div className="absolute inset-0 pointer-events-none" style={{ paddingLeft: 60 }}>
              <div className="relative h-full w-full" style={{ minWidth: "calc(800px - 60px)" }}>
                <AnimatePresence>
                  {filteredEvents.map((ev) => {
                    const totalMinStart = (ev.startHour - 8) * 80 + (ev.startMin / 60) * 80;
                    const totalMinEnd = (ev.endHour - 8) * 80 + (ev.endMin / 60) * 80;
                    const height = totalMinEnd - totalMinStart;
                    const top = totalMinStart + 36;
                    const colWidth = 100 / 7;
                    const left = `${ev.day * colWidth}%`;
                    const width = `${colWidth}%`;
                    return (
                      <motion.div key={ev.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.25 }}
                        className={`absolute pointer-events-auto cursor-pointer rounded-lg ${ev.bg} border-l-[3px] ${ev.border} backdrop-blur-sm px-2.5 py-2 transition-all duration-200 hover:scale-[1.02] hover:brightness-125`}
                        style={{ top, left, width, height, paddingRight: 8 }}
                        onClick={() => openEventDetail(ev)}
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
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                {timeInRange && (
                  <div className="absolute left-0 right-0 flex items-center z-20 pointer-events-none" style={{ top: (currentHour - 8) * 80 + (currentMin / 60) * 80 + 36 }}>
                    <span className="shrink-0 -ml-[60px] w-[60px] text-center text-[10px] font-bold text-neon-purple bg-neon-purple/20 rounded-md px-1.5 py-0.5">{pad(currentHour)}:{pad(currentMin)}</span>
                    <div className="flex-1 h-[2px] bg-neon-purple shadow-glow-purple" />
                    <div className="w-2.5 h-2.5 rounded-full bg-neon-purple shadow-glow-purple -ml-1" />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      <EventDetailModal event={selectedEvent} open={modalOpen} onClose={() => setModalOpen(false)} onDelete={deleteEvent} />
    </div>
  );
};

export default Schedule;
