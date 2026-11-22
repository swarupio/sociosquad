import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const KEY = "sociosquad:install-dismissed-at";
const SNOOZE_MS = 14 * 24 * 60 * 60 * 1000;

function snoozed(): boolean {
  try {
    const at = Number(localStorage.getItem(KEY));
    return Number.isFinite(at) && at > 0 && Date.now() - at < SNOOZE_MS;
  } catch {
    return false;
  }
}

export function InstallPrompt() {
  const [evt, setEvt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      if (!snoozed()) setEvt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setEvt(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!evt) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
    setEvt(null);
  };
  const install = async () => {
    await evt.prompt();
    await evt.userChoice.catch(() => undefined);
    setEvt(null);
  };

  return (
    <div
      role="dialog"
      aria-label="Install SocioSquad"
      className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-sm rounded-lg border bg-card p-4 text-card-foreground shadow-lg"
    >
      <p className="font-medium">Install SocioSquad</p>
      <p className="mt-1 text-sm text-muted-foreground">Add the app to your home screen for quick access.</p>
      <div className="mt-3 flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={dismiss}>
          Not now
        </Button>
        <Button size="sm" onClick={install}>
          Install
        </Button>
      </div>
    </div>
  );
}

export default InstallPrompt;
