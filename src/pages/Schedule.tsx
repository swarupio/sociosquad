import { useState, useEffect, useMemo, useCallback } from "react";

import {
  Home, CalendarDays, MessageSquare, Settings,
  ChevronLeft, ChevronRight, Sparkles, Clock,
  TreePine, Utensils, Users, Waves, Bus, Loader2, CheckCircle2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import EventDetailModal from "@/components/schedule/EventDetailModal";
import ScheduleSidebar from "@/components/schedule/ScheduleSidebar";
import type { CalEvent, CalendarCategory, CalendarToggle } from "@/components/schedule/types";
import { DAYS, HOURS, pad, getWeekStart, formatTime } from "@/components/schedule/data";
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
  const [activeCategories, setActiveCategories] = useState<Record<string, boolean>>({});

  const {
    loading, rawEvents, tasks,
    toggleTask, addTask, editTask, deleteTask, deleteEvent, toggleRegistration,
  } = useScheduleData();

  const events: CalEvent[] = useMemo(
    () => rawEvents.map((e) => ({ ...e, icon: iconMap[e.iconName], registered: e.registered })),
    [rawEvents]
  );

  // Derive calendar toggles dynamically from events
  const CATEGORY_COLORS: Record<string, string> = {
    "Personal Calendar": "bg-sky-400",
    "SocioSquad Events": "bg-amber-400",
    "NSS Camps": "bg-emerald-400",
    "Urgent Relief": "bg-rose-400",
  };
  const FALLBACK_COLORS = ["bg-violet-400", "bg-cyan-400", "bg-orange-400", "bg-fuchsia-400", "bg-lime-400"];

  const dynamicCalendars: CalendarToggle[] = useMemo(() => {
    const categories = [...new Set(events.map((e) => e.category))];
    let fallbackIdx = 0;
    return categories.map((cat) => ({
      label: cat,
      color: CATEGORY_COLORS[cat] || FALLBACK_COLORS[fallbackIdx++ % FALLBACK_COLORS.length],
    }));
  }, [events]);

  // Auto-enable new categories
  useEffect(() => {
    setActiveCategories((prev) => {
      const next = { ...prev };
      dynamicCalendars.forEach((cal) => {
        if (!(cal.label in next)) next[cal.label] = true;
      });
      return next;
    });
  }, [dynamicCalendars]);

  const [selectedEvent, setSelectedEvent] = useState<CalEvent | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeDate, setActiveDate] = useState(new Date());

  // Week navigation
  const weekStart = useMemo(() => getWeekStart(activeDate), [activeDate]);
  const weekDates = useMemo(() => {
    return DAYS.map((_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [weekStart]);

  const filteredEvents = useMemo(() => {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    return events.filter((ev) => {
      if (!activeCategories[ev.category]) return false;
      const evStart = new Date(ev.startTime);
      return evStart >= weekStart && evStart < weekEnd;
    });
  }, [events, activeCategories, weekStart]);

  useEffect(() => {
    const id = setInterval(() => setCurrentTime(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const currentHour = currentTime.getHours();
  const currentMin = currentTime.getMinutes();
  const timeInRange = currentHour >= 8 && currentHour < 19;

  // Check if current time indicator should show (only on the current week)
  const todayInWeek = useMemo(() => {
    const today = new Date();
    return weekDates.findIndex((d) =>
      d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()
    );
  }, [weekDates]);

  const toggleCategory = useCallback((label: CalendarCategory) => {
    setActiveCategories((prev) => ({ ...prev, [label]: !prev[label] }));
  }, []);

  const resetToToday = useCallback(() => {
    setActiveDate(new Date());
  }, []);

  const prevPeriod = useCallback(() => {
    setActiveDate((prev) => {
      const d = new Date(prev);
      if (view === "Month") {
        d.setMonth(d.getMonth() - 1);
      } else {
        d.setDate(d.getDate() - 7);
      }
      return d;
    });
  }, [view]);

  const nextPeriod = useCallback(() => {
    setActiveDate((prev) => {
      const d = new Date(prev);
      if (view === "Month") {
        d.setMonth(d.getMonth() + 1);
      } else {
        d.setDate(d.getDate() + 7);
      }
      return d;
    });
  }, [view]);

  const openEventDetail = useCallback((ev: CalEvent) => {
    setSelectedEvent(ev);
    setModalOpen(true);
  }, []);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Icon rail */}
      <nav className="w-[56px] shrink-0 flex flex-col items-center py-6 gap-6 border-r border-border bg-card">
        <button onClick={() => navigate("/")} className="p-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"><Home className="w-5 h-5" /></button>
        <button className="p-2.5 rounded-xl bg-navy/10 text-navy transition-colors"><CalendarDays className="w-5 h-5" /></button>
        <button className="p-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"><MessageSquare className="w-5 h-5" /></button>
        <div className="flex-1" />
        <button className="p-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"><Settings className="w-5 h-5" /></button>
      </nav>

      {/* Sidebar */}
      <ScheduleSidebar
        activeDate={activeDate}
        onSelectDate={setActiveDate}
        activeCategories={activeCategories}
        onToggleCategory={toggleCategory}
        calendars={dynamicCalendars}
        tasks={tasks}
        onToggleTask={toggleTask}
        onAddTask={addTask}
        onEditTask={editTask}
        onDeleteTask={deleteTask}
      />

      {/* Main calendar */}
      <main className="flex-1 flex flex-col overflow-hidden bg-card">
        <header className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <button onClick={prevPeriod} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <h1 className="text-xl font-bold text-foreground">
                {activeDate.toLocaleString("default", { month: "long" })} {activeDate.getFullYear()}
              </h1>
              <button onClick={nextPeriod} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <button onClick={resetToToday} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-navy/10 text-navy hover:bg-navy/20 transition-colors">Today</button>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex rounded-lg overflow-hidden border border-border">
              {(["Week", "Month"] as const).map((v) => (
                <button key={v} onClick={() => setView(v)} className={`text-xs font-semibold px-4 py-1.5 transition-colors ${view === v ? "bg-navy text-navy-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}>{v}</button>
              ))}
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border">
              <span className="w-2 h-2 rounded-full bg-teal animate-pulse" />
              <span className="text-xs font-medium text-muted-foreground">Availability</span>
            </div>
          </div>
        </header>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-navy animate-spin" />
          </div>
        ) : view === "Month" ? (
          (() => {
            const year = activeDate.getFullYear();
            const month = activeDate.getMonth();
            const firstDay = new Date(year, month, 1);
            const lastDay = new Date(year, month + 1, 0);
            const startPad = (firstDay.getDay() + 6) % 7; // Monday-based
            const totalDays = lastDay.getDate();
            const cells: (number | null)[] = Array(startPad).fill(null);
            for (let d = 1; d <= totalDays; d++) cells.push(d);
            while (cells.length % 7 !== 0) cells.push(null);

            const today = new Date();

            // Group filtered events by day-of-month
            const monthEvents = events.filter((ev) => {
              if (!activeCategories[ev.category]) return false;
              const d = new Date(ev.startTime);
              return d.getMonth() === month && d.getFullYear() === year;
            });
            const eventsByDay: Record<number, CalEvent[]> = {};
            monthEvents.forEach((ev) => {
              const d = new Date(ev.startTime).getDate();
              if (!eventsByDay[d]) eventsByDay[d] = [];
              eventsByDay[d].push(ev);
            });

            return (
              <div className="flex-1 overflow-auto p-4">
                <div className="grid grid-cols-7 gap-px bg-border rounded-xl overflow-hidden">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                    <div key={d} className="bg-card py-2 text-center text-xs font-semibold text-muted-foreground">{d}</div>
                  ))}
                  {cells.map((day, i) => {
                    const isToday = day !== null && day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
                    const isSelected = day !== null && day === activeDate.getDate() && month === activeDate.getMonth();
                    const dayEvents = day ? (eventsByDay[day] || []) : [];

                    return (
                      <div
                        key={i}
                        onClick={() => day && setActiveDate(new Date(year, month, day))}
                        className={`bg-card min-h-[100px] p-1.5 cursor-pointer transition-colors hover:bg-secondary/50 ${day === null ? "opacity-30" : ""}`}
                      >
                        {day !== null && (
                          <>
                            <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold mb-1 ${
                              isToday ? "bg-navy text-navy-foreground" :
                              isSelected ? "bg-primary/10 text-primary font-bold" :
                              "text-foreground/70"
                            }`}>
                              {day}
                            </span>
                            <div className="space-y-0.5">
                              {dayEvents.slice(0, 3).map((ev) => (
                                <div
                                  key={ev.id}
                                  onClick={(e) => { e.stopPropagation(); openEventDetail(ev); }}
                                  className={`${ev.bg} ${ev.color} text-[10px] font-medium px-1.5 py-0.5 rounded truncate cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-1`}
                                >
                                  {ev.registered && <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 shrink-0" />}
                                  {ev.title}
                                </div>
                              ))}
                              {dayEvents.length > 3 && (
                                <span className="text-[9px] text-muted-foreground font-medium px-1.5">+{dayEvents.length - 3} more</span>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()
        ) : (
          <div className="flex-1 overflow-auto relative pt-2">
            <div className="grid min-w-[800px]" style={{ gridTemplateColumns: "60px repeat(7, 1fr)" }}>
              <div className="sticky top-0 z-10 bg-card" />
              {weekDates.map((d, i) => {
                const today = new Date();
                const isToday = d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
                return (
                  <div key={i} className={`sticky top-0 z-10 py-3 text-center border-b border-border bg-card ${isToday ? "bg-navy/5" : ""}`}>
                    <div className="text-xs font-semibold text-muted-foreground">{DAYS[i]}</div>
                    <div className={`text-sm font-bold ${isToday ? "text-navy" : "text-foreground/70"}`}>{d.getDate()}</div>
                  </div>
                );
              })}
              {HOURS.map((h) => (
                <div key={`row-${h}`} className="contents">
                  <div className="relative text-[11px] text-muted-foreground text-right pr-3 border-r border-border" style={{ height: 80 }}>
                    <span className="absolute -top-2 right-3">{pad(h)}:00</span>
                  </div>
                  {DAYS.map((_, di) => (
                    <div key={`cell-${h}-${di}`} className="relative border-b border-r border-border" style={{ height: 80 }}>
                      <div className="absolute inset-x-0 top-1/2 border-t border-dotted border-border/50" />
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <div className="absolute inset-0 pointer-events-none" style={{ paddingLeft: 60 }}>
              <div className="relative h-full w-full" style={{ minWidth: "calc(800px - 60px)" }}>
                <AnimatePresence>
                  {(() => {
                    // Pre-compute layout info for overlap detection
                    const layoutItems = filteredEvents.map((ev) => {
                      const evStart = new Date(ev.startTime);
                      const evEnd = new Date(ev.endTime);
                      const dayIndex = (evStart.getDay() + 6) % 7;
                      const startMin = evStart.getHours() * 60 + evStart.getMinutes();
                      const endMin = evEnd.getHours() * 60 + evEnd.getMinutes();
                      return { ev, dayIndex, startMin, endMin };
                    });

                    // Group by day, then compute overlap columns
                    const dayGroups: Record<number, typeof layoutItems> = {};
                    layoutItems.forEach((item) => {
                      if (!dayGroups[item.dayIndex]) dayGroups[item.dayIndex] = [];
                      dayGroups[item.dayIndex].push(item);
                    });

                    // For each day, assign column index and total columns for overlapping events
                    const overlapMap = new Map<string, { col: number; totalCols: number }>();

                    Object.values(dayGroups).forEach((group) => {
                      // Sort by start time
                      group.sort((a, b) => a.startMin - b.startMin);

                      // Find overlap clusters
                      const clusters: (typeof group)[] = [];
                      let currentCluster: typeof group = [];

                      group.forEach((item) => {
                        if (currentCluster.length === 0) {
                          currentCluster.push(item);
                        } else {
                          const clusterEnd = Math.max(...currentCluster.map((c) => c.endMin));
                          if (item.startMin < clusterEnd) {
                            currentCluster.push(item);
                          } else {
                            clusters.push(currentCluster);
                            currentCluster = [item];
                          }
                        }
                      });
                      if (currentCluster.length > 0) clusters.push(currentCluster);

                      clusters.forEach((cluster) => {
                        const totalCols = cluster.length;
                        cluster.forEach((item, colIdx) => {
                          overlapMap.set(item.ev.id, { col: colIdx, totalCols });
                        });
                      });
                    });

                    return layoutItems.map(({ ev, dayIndex }) => {
                      const evStart = new Date(ev.startTime);
                      const evEnd = new Date(ev.endTime);
                      const startHour = evStart.getHours();
                      const startMinute = evStart.getMinutes();
                      const endHour = evEnd.getHours();
                      const endMinute = evEnd.getMinutes();

                      const totalMinStart = (startHour - 8) * 80 + (startMinute / 60) * 80;
                      const totalMinEnd = (endHour - 8) * 80 + (endMinute / 60) * 80;
                      const height = totalMinEnd - totalMinStart;
                      const top = totalMinStart + 64;

                      const colWidth = 100 / 7;
                      const overlap = overlapMap.get(ev.id) || { col: 0, totalCols: 1 };
                      const slotWidth = colWidth / overlap.totalCols;
                      const left = `${dayIndex * colWidth + overlap.col * slotWidth}%`;
                      const width = `${slotWidth}%`;

                      return (
                        <motion.div key={ev.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.25 }}
                          className={`absolute pointer-events-auto cursor-pointer rounded-lg ${ev.bg} border-l-[3px] ${ev.border} px-2 py-1.5 transition-all duration-200 hover:scale-[1.02] hover:shadow-md ${ev.registered ? "ring-2 ring-emerald-400/50 ring-offset-1 ring-offset-background" : ""}`}
                          style={{ top, left, width, height, paddingRight: 4 }}
                          onClick={() => openEventDetail(ev)}
                        >
                          <div className={`flex items-center gap-1 ${ev.color} mb-0.5`}>
                            {ev.icon}
                            <span className="text-[11px] font-bold truncate">{ev.title}</span>
                            {ev.registered && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            )}
                          </div>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTime(evStart)} – {formatTime(evEnd)}
                          </span>
                          {ev.badge && overlap.totalCols <= 2 && (
                            <span className="mt-1 inline-flex items-center gap-1 text-[9px] font-semibold text-warm bg-warm/10 px-1.5 py-0.5 rounded-full truncate">
                              <Sparkles className="w-3 h-3 shrink-0" /> {ev.badge}
                            </span>
                          )}
                          {ev.registered && height > 60 && overlap.totalCols <= 2 && (
                            <span className="mt-1 inline-flex items-center gap-1 text-[9px] font-semibold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full">
                              <CheckCircle2 className="w-2.5 h-2.5" /> You're in
                            </span>
                          )}
                        </motion.div>
                      );
                    });
                  })()}
                </AnimatePresence>

                {timeInRange && todayInWeek >= 0 && (
                  <div className="absolute left-0 right-0 flex items-center z-20 pointer-events-none" style={{ top: (currentHour - 8) * 80 + (currentMin / 60) * 80 + 64 }}>
                    <span className="shrink-0 -ml-[60px] w-[60px] text-center text-[10px] font-bold text-destructive bg-destructive/10 rounded-md px-1.5 py-0.5">{pad(currentHour)}:{pad(currentMin)}</span>
                    <div className="flex-1 h-[2px] bg-destructive/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-destructive -ml-1" />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      <EventDetailModal event={selectedEvent} open={modalOpen} onClose={() => setModalOpen(false)} onDelete={deleteEvent} onToggleRegistration={toggleRegistration} />
    </div>
  );
};

export default Schedule;
