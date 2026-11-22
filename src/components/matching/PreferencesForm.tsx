import { useEffect, useState, type FormEvent } from "react";
import { Loader2, LocateFixed, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  EMPTY_PREFERENCES,
  useVolunteerPreferences,
  type VolunteerPreferences,
} from "@/hooks/useVolunteerPreferences";
import { AVAILABILITY_OPTIONS, CAUSES, SKILL_SUGGESTIONS } from "@/lib/matching";

const MAX_ITEMS = 30;

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function PreferencesForm({ onSaved }: { onSaved?: () => void }) {
  const { prefs, isLoading, isSaving, notEnabled, save } = useVolunteerPreferences();
  const { toast } = useToast();
  const [draft, setDraft] = useState<VolunteerPreferences>(EMPTY_PREFERENCES);
  const [skillInput, setSkillInput] = useState("");
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (prefs) setDraft(prefs);
  }, [prefs]);

  const addSkill = (raw: string) => {
    const v = raw.trim();
    if (!v) return;
    setDraft((d) => {
      if (d.skills.length >= MAX_ITEMS || d.skills.some((s) => s.toLowerCase() === v.toLowerCase())) return d;
      return { ...d, skills: [...d.skills, v.slice(0, 60)] };
    });
    setSkillInput("");
  };

  const useMyLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast({ title: "Location unavailable", description: "Your browser does not support geolocation.", variant: "destructive" });
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setDraft((d) => ({ ...d, home_latitude: pos.coords.latitude, home_longitude: pos.coords.longitude }));
        setLocating(false);
      },
      () => {
        setLocating(false);
        toast({ title: "Could not get your location", description: "Check your browser permissions and try again.", variant: "destructive" });
      },
      { timeout: 10_000 }
    );
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await save(draft);
      toast({ title: "Preferences saved", description: "Your recommendations will now be personalised." });
      onSaved?.();
    } catch {
      toast({ title: "Could not save preferences", description: "Please try again.", variant: "destructive" });
    }
  };

  if (notEnabled) {
    return (
      <p role="status" className="text-sm text-muted-foreground">
        Personalised matching is not enabled yet. Please check back soon.
      </p>
    );
  }

  const hasLocation = draft.home_latitude !== null && draft.home_longitude !== null;
  const suggestions = SKILL_SUGGESTIONS.filter((s) => !draft.skills.some((k) => k.toLowerCase() === s.toLowerCase()));

  return (
    <form onSubmit={onSubmit} className="space-y-6" aria-busy={isLoading}>
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Your skills</legend>
        <ul className="flex flex-wrap gap-2" aria-label="Selected skills">
          {draft.skills.map((s) => (
            <li key={s} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary">
              {s}
              <button
                type="button"
                aria-label={`Remove skill ${s}`}
                className="rounded-full p-0.5 hover:bg-primary/20 focus-visible:outline focus-visible:outline-2"
                onClick={() => setDraft((d) => ({ ...d, skills: d.skills.filter((k) => k !== s) }))}
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <Label htmlFor="pref-skill-input" className="sr-only">
            Add a skill
          </Label>
          <Input
            id="pref-skill-input"
            value={skillInput}
            maxLength={60}
            placeholder="Add a skill, e.g. Teaching"
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addSkill(skillInput);
              }
            }}
          />
          <Button type="button" variant="outline" onClick={() => addSkill(skillInput)} disabled={!skillInput.trim()}>
            <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
            Add
          </Button>
        </div>
        {suggestions.length > 0 && (
          <div className="flex flex-wrap gap-2" aria-label="Suggested skills">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => addSkill(s)}
                className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:bg-muted focus-visible:outline focus-visible:outline-2"
              >
                + {s}
              </button>
            ))}
          </div>
        )}
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Causes you care about</legend>
        <div className="flex flex-wrap gap-2">
          {CAUSES.map((c) => {
            const on = draft.causes.includes(c);
            return (
              <button
                key={c}
                type="button"
                aria-pressed={on}
                onClick={() => setDraft((d) => ({ ...d, causes: toggle(d.causes, c) }))}
                className={`rounded-full border px-4 py-1.5 text-sm transition-colors focus-visible:outline focus-visible:outline-2 ${
                  on ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted"
                }`}
              >
                {c}
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Availability</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {AVAILABILITY_OPTIONS.map((o) => (
            <label key={o.value} className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 accent-primary"
                checked={draft.availability.includes(o.value)}
                onChange={() => setDraft((d) => ({ ...d, availability: toggle(d.availability, o.value) }))}
              />
              {o.label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Distance</legend>
        <div className="flex items-center gap-3">
          <Label htmlFor="pref-distance" className="text-sm">
            Travel up to
          </Label>
          <input
            id="pref-distance"
            type="range"
            min={1}
            max={100}
            step={1}
            value={draft.max_distance_km ?? 25}
            onChange={(e) => setDraft((d) => ({ ...d, max_distance_km: Number(e.target.value) }))}
            className="flex-1 accent-primary"
            aria-valuetext={`${draft.max_distance_km ?? 25} kilometres`}
          />
          <span className="w-16 text-sm tabular-nums">{draft.max_distance_km ?? 25} km</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="outline" onClick={useMyLocation} disabled={locating}>
            {locating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <LocateFixed className="mr-2 h-4 w-4" aria-hidden="true" />
            )}
            Use my current location
          </Button>
          <span className="text-xs text-muted-foreground" role="status">
            {hasLocation ? "Location saved for distance matching." : "Optional. Used only to rank nearby opportunities."}
          </span>
          {hasLocation && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setDraft((d) => ({ ...d, home_latitude: null, home_longitude: null }))}
            >
              Clear
            </Button>
          )}
        </div>
      </fieldset>

      <Button type="submit" disabled={isSaving || isLoading}>
        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
        Save preferences
      </Button>
    </form>
  );
}

export default PreferencesForm;
