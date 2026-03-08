import { useState } from "react";
import {
  Search, ChevronLeft, ChevronRight, CheckCircle2, Circle,
  Plus, Pencil, Trash2, X,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { buildMiniCal } from "./data";
import type { CalendarCategory, CalendarToggle, Task } from "./types";

interface Props {
  activeDate: Date;
  onSelectDate: (date: Date) => void;
  activeCategories: Record<CalendarCategory, boolean>;
  onToggleCategory: (label: CalendarCategory) => void;
  tasks: Record<"today" | "tomorrow", Task[]>;
  onToggleTask: (period: "today" | "tomorrow", id: string) => void;
  onAddTask: (period: "today" | "tomorrow", text: string) => void;
  onEditTask: (period: "today" | "tomorrow", id: string, text: string) => void;
  onDeleteTask: (period: "today" | "tomorrow", id: string) => void;
}

const ScheduleSidebar = ({
  activeDate, onSelectDate,
  activeCategories, onToggleCategory,
  tasks, onToggleTask, onAddTask, onEditTask, onDeleteTask,
}: Props) => {
  const [miniMonth, setMiniMonth] = useState(activeDate.getMonth());
  const [miniYear, setMiniYear] = useState(activeDate.getFullYear());

  const [addingIn, setAddingIn] = useState<"today" | "tomorrow" | null>(null);
  const [addText, setAddText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const miniDays = buildMiniCal(miniYear, miniMonth);
  const monthName = new Date(miniYear, miniMonth).toLocaleString("default", { month: "long" });

  const handleDateClick = (day: number | null) => {
    if (day === null) return;
    onSelectDate(new Date(miniYear, miniMonth, day));
  };

  const prevMonth = () => {
    if (miniMonth === 0) { setMiniMonth(11); setMiniYear(miniYear - 1); }
    else setMiniMonth(miniMonth - 1);
  };

  const nextMonth = () => {
    if (miniMonth === 11) { setMiniMonth(0); setMiniYear(miniYear + 1); }
    else setMiniMonth(miniMonth + 1);
  };

  const handleAdd = (period: "today" | "tomorrow") => {
    if (addText.trim()) {
      onAddTask(period, addText.trim());
    }
    setAddText("");
    setAddingIn(null);
  };

  const handleSaveEdit = (period: "today" | "tomorrow", id: string) => {
    if (editText.trim()) {
      onEditTask(period, id, editText.trim());
    }
    setEditingId(null);
    setEditText("");
  };

  return (
    <aside className="w-[260px] shrink-0 border-r border-border flex flex-col overflow-y-auto bg-card">
      {/* Search */}
      <div className="p-4">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary border border-border">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input type="text" placeholder="Search events…" className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none w-full" />
        </div>
      </div>

      {/* Mini calendar */}
      <div className="px-4 pb-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-foreground">{monthName} {miniYear}</span>
          <div className="flex gap-1">
            <button onClick={prevMonth} className="p-1 rounded-md hover:bg-secondary text-muted-foreground"><ChevronLeft className="w-4 h-4" /></button>
            <button onClick={nextMonth} className="p-1 rounded-md hover:bg-secondary text-muted-foreground"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
        <div className="grid grid-cols-7 text-center text-[11px] text-muted-foreground mb-1">
          {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <span key={i} className="py-1">{d}</span>)}
        </div>
        <div className="grid grid-cols-7 text-center text-xs">
          {miniDays.map((d, i) => {
            const isActive = d !== null && d === activeDate.getDate() && miniMonth === activeDate.getMonth() && miniYear === activeDate.getFullYear();
            const today = new Date();
            const isToday = d !== null && d === today.getDate() && miniMonth === today.getMonth() && miniYear === today.getFullYear();
            return (
              <span
                key={i}
                onClick={() => handleDateClick(d)}
                className={`py-1.5 rounded-lg cursor-pointer transition-colors ${
                  d === null ? "" :
                  isActive ? "bg-navy text-navy-foreground font-bold" :
                  isToday ? "ring-1 ring-navy text-navy font-semibold hover:bg-secondary" :
                  "text-foreground/70 hover:bg-secondary"
                }`}
              >
                {d ?? ""}
              </span>
            );
          })}
        </div>
      </div>

      <div className="h-px mx-4 bg-border" />

      {/* My Calendars */}
      <div className="p-4">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">My Calendars</h3>
        <div className="space-y-3">
          {calendars.map((cal) => (
            <label key={cal.label} className="flex items-center gap-3 cursor-pointer group">
              <Switch checked={activeCategories[cal.label]} onCheckedChange={() => onToggleCategory(cal.label)} className="data-[state=checked]:bg-navy scale-75" />
              <span className={`w-2.5 h-2.5 rounded-full ${cal.color}`} />
              <span className="text-sm text-foreground/80 group-hover:text-foreground transition-colors">{cal.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="h-px mx-4 bg-border" />

      {/* Upcoming Tasks */}
      <div className="p-4 flex-1">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Upcoming Tasks</h3>
        {(["today", "tomorrow"] as const).map((period) => (
          <div key={period} className="mb-4">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{period}</span>
            <div className="mt-2 space-y-1">
              {tasks[period].map((t) => (
                <div key={t.id} className="group flex items-center gap-2.5 w-full rounded-md px-1 py-1 hover:bg-secondary transition-colors">
                  <button onClick={() => onToggleTask(period, t.id)} className="shrink-0">
                    {t.done
                      ? <CheckCircle2 className="w-4 h-4 text-teal" />
                      : <Circle className="w-4 h-4 text-muted-foreground group-hover:text-navy transition-colors" />
                    }
                  </button>

                  {editingId === t.id ? (
                    <input
                      autoFocus
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleSaveEdit(period, t.id); if (e.key === "Escape") setEditingId(null); }}
                      onBlur={() => handleSaveEdit(period, t.id)}
                      className="flex-1 text-sm bg-secondary text-foreground rounded px-2 py-0.5 outline-none ring-1 ring-navy/30"
                    />
                  ) : (
                    <span className={`flex-1 text-sm leading-snug transition-all duration-200 ${t.done ? "line-through text-muted-foreground" : "text-foreground"}`}>
                      {t.text}
                    </span>
                  )}

                  {editingId !== t.id && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditingId(t.id); setEditText(t.text); }}
                        className="p-0.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onDeleteTask(period, t.id); }}
                        className="p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {addingIn === period ? (
                <div className="flex items-center gap-2 px-1 py-1">
                  <Plus className="w-4 h-4 text-muted-foreground shrink-0" />
                  <input
                    autoFocus
                    value={addText}
                    onChange={(e) => setAddText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleAdd(period); if (e.key === "Escape") { setAddingIn(null); setAddText(""); } }}
                    onBlur={() => handleAdd(period)}
                    placeholder="Type and press Enter…"
                    className="flex-1 text-sm bg-secondary text-foreground rounded px-2 py-0.5 outline-none ring-1 ring-navy/30 placeholder:text-muted-foreground"
                  />
                  <button onClick={() => { setAddingIn(null); setAddText(""); }} className="text-muted-foreground hover:text-foreground">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { setAddingIn(period); setAddText(""); }}
                  className="flex items-center gap-2 px-1 py-1 text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add new task</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
};

export default ScheduleSidebar;
