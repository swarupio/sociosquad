import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Clock, Tag, CalendarDays, CheckCircle2, UserPlus } from "lucide-react";
import type { CalEvent } from "./types";
import { formatTime } from "./data";

interface Props {
  event: CalEvent | null;
  open: boolean;
  onClose: () => void;
  onDelete: (id: string) => void;
  onToggleRegistration: (id: string) => void;
}

const EventDetailModal = ({ event, open, onClose, onDelete, onToggleRegistration }: Props) => {
  if (!event) return null;

  const start = new Date(event.startTime);
  const end = new Date(event.endTime);
  const dateStr = start.toLocaleDateString("default", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
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
            <span>{event.category}</span>
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
