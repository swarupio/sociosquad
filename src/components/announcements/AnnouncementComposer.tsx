import { useId, useState } from "react";
import { Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useCreateAnnouncement } from "@/hooks/useAnnouncements";
import { BODY_MAX, TITLE_MAX, validateAnnouncement } from "@/lib/announcements";

interface AnnouncementComposerProps {
  opportunityId: string;
  orgId: string;
  registeredCount?: number;
}

export function AnnouncementComposer({ opportunityId, orgId, registeredCount }: AnnouncementComposerProps) {
  const uid = useId();
  const { toast } = useToast();
  const create = useCreateAnnouncement(opportunityId, orgId);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pinned, setPinned] = useState(false);
  const [touched, setTouched] = useState(false);

  const { valid, errors } = validateAnnouncement({ title, body });
  const showErrors = touched;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!valid) return;
    create.mutate(
      { title, body, pinned },
      {
        onSuccess: () => {
          setTitle("");
          setBody("");
          setPinned(false);
          setTouched(false);
          toast({ title: "Update posted", description: "Registered volunteers can now see it." });
        },
        onError: (err) =>
          toast({
            title: "Could not post update",
            description: err instanceof Error ? err.message : "Please try again.",
            variant: "destructive",
          }),
      },
    );
  };

  return (
    <form onSubmit={onSubmit} className="glass-card space-y-4 rounded-xl p-4" noValidate>
      <div className="flex items-center gap-2">
        <Megaphone className="h-4 w-4 text-primary" aria-hidden="true" />
        <h3 className="text-sm font-semibold text-foreground">Post an update</h3>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${uid}-title`}>Title</Label>
        <Input
          id={`${uid}-title`}
          value={title}
          maxLength={TITLE_MAX}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Venue changed"
          aria-invalid={showErrors && !!errors.title}
          aria-describedby={`${uid}-title-help`}
        />
        <div id={`${uid}-title-help`} className="flex justify-between text-xs">
          <span className="text-destructive" role={showErrors && errors.title ? "alert" : undefined}>
            {showErrors ? errors.title : ""}
          </span>
          <span className="text-muted-foreground">
            {title.length}/{TITLE_MAX}
          </span>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${uid}-body`}>Message</Label>
        <Textarea
          id={`${uid}-body`}
          value={body}
          maxLength={BODY_MAX}
          rows={4}
          onChange={(e) => setBody(e.target.value)}
          placeholder="e.g. Please bring a government ID."
          aria-invalid={showErrors && !!errors.body}
          aria-describedby={`${uid}-body-help`}
        />
        <div id={`${uid}-body-help`} className="flex justify-between text-xs">
          <span className="text-destructive" role={showErrors && errors.body ? "alert" : undefined}>
            {showErrors ? errors.body : ""}
          </span>
          <span className="text-muted-foreground">
            {body.length}/{BODY_MAX}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Switch id={`${uid}-pin`} checked={pinned} onCheckedChange={setPinned} />
        <Label htmlFor={`${uid}-pin`}>Pin to top</Label>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {typeof registeredCount === "number"
            ? `Visible to ${registeredCount} registered volunteer${registeredCount === 1 ? "" : "s"}`
            : "Visible to registered volunteers"}
        </p>
        <Button type="submit" disabled={create.isPending}>
          {create.isPending ? "Posting..." : "Post update"}
        </Button>
      </div>
    </form>
  );
}

export default AnnouncementComposer;
