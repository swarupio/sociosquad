import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Clock, Tag, Pencil, Trash2 } from "lucide-react";
import type { CalEvent } from "./types";

const pad = (n: number) => String(n).padStart(2, "0");

interface Props {
  event: CalEvent | null;
  open: boolean;
  onClose: () => void;
  onDelete: (id: string) => void;
}

const EventDetailModal = ({ event, open, onClose, onDelete }: Props) => {
  if (!event) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="sm:max-w-md border-border/50"
        style={{ backgroundColor: "#1a1328" }}
      >
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <span className={`w-3 h-3 rounded-full ${event.bg} border ${event.border}`} />
            <DialogTitle className="text-foreground">{event.title}</DialogTitle>
          </div>
          <DialogDescription className="text-muted-foreground">
            {event.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="flex items-center gap-2 text-sm text-foreground/70">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span>
              {pad(event.startHour)}:{pad(event.startMin)} – {pad(event.endHour)}:{pad(event.endMin)}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-foreground/70">
            <Tag className="w-4 h-4 text-muted-foreground" />
            <span>{event.category}</span>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 border-border/50">
            <Pencil className="w-3.5 h-3.5" /> Edit
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="gap-1.5"
            onClick={() => {
              onDelete(event.id);
              onClose();
            }}
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EventDetailModal;
