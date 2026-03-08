import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Clock, Tag, CalendarDays, CheckCircle2, UserPlus, Pencil } from "lucide-react";
import type { CalEvent } from "./types";
import { formatTime } from "./data";

interface Props {
  event: CalEvent | null;
  open: boolean;
  onClose: () => void;
  onDelete: (id: string) => void;
  onToggleRegistration: (id: string) => void;
  onChangeCategory?: (id: string, category: string) => void;
  availableCategories?: string[];
}

const EventDetailModal = ({ event, open, onClose, onDelete, onToggleRegistration, onChangeCategory, availableCategories = [] }: Props) => {
  const [editingCategory, setEditingCategory] = useState(false);

  const start = event ? new Date(event.startTime) : new Date();
  const end = event ? new Date(event.endTime) : new Date();
  const dateStr = event ? start.toLocaleDateString("default", { weekday: "long", month: "long", day: "numeric", year: "numeric" }) : "";
  const isOppEvent = event ? event.id.startsWith("opp-") : false;

  if (!event) return null;




  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { onClose(); setEditingCategory(false); } }}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <span className={`w-3 h-3 rounded-full ${event.bg} border ${event.border}`} />
            <DialogTitle className="text-foreground">{event.title}</DialogTitle>
            {event.registered && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-3 h-3" /> Registered
              </span>
            )}
          </div>
          <DialogDescription className="text-muted-foreground">
            {event.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="flex items-center gap-2 text-sm text-foreground">
            <CalendarDays className="w-4 h-4 text-muted-foreground" />
            <span>{dateStr}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-foreground">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span>{formatTime(start)} – {formatTime(end)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-foreground">
            <Tag className="w-4 h-4 text-muted-foreground" />
            {editingCategory && onChangeCategory && availableCategories.length > 0 ? (
              <Select
                defaultValue={event.category}
                onValueChange={(val) => {
                  onChangeCategory(event.id, val);
                  setEditingCategory(false);
                }}
              >
                <SelectTrigger className="h-8 w-48 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <span className="flex items-center gap-1.5">
                {event.category}
                {!isOppEvent && onChangeCategory && (
                  <button
                    onClick={() => setEditingCategory(true)}
                    className="p-0.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                )}
              </span>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant={event.registered ? "outline" : "default"}
            size="sm"
            className="gap-1.5"
            onClick={() => onToggleRegistration(event.id)}
          >
            {event.registered ? (
              <><CheckCircle2 className="w-3.5 h-3.5" /> Unregister</>
            ) : (
              <><UserPlus className="w-3.5 h-3.5" /> Register</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EventDetailModal;
