export interface ServiceWorkerOptions {
  onUpdate?: (applyUpdate: () => void) => void;
}

/** Registers /sw.js in production only. Returns true if registration was attempted. */
export function registerServiceWorker(options: ServiceWorkerOptions = {}): boolean {
  if (!import.meta.env.PROD) return false;
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return false;

  const start = () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        const notify = (worker: ServiceWorker) =>
          options.onUpdate?.(() => worker.postMessage({ type: "SKIP_WAITING" }));
        if (reg.waiting && navigator.serviceWorker.controller) notify(reg.waiting);
        reg.addEventListener("updatefound", () => {
          const w = reg.installing;
          if (!w) return;
          w.addEventListener("statechange", () => {
            if (w.state === "installed" && navigator.serviceWorker.controller) notify(w);
          });
        });
      })
      .catch(() => {
        /* registration failure is non-fatal */
      });
    let reloaded = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    });
  };

  if (document.readyState === "complete") start();
  else window.addEventListener("load", start, { once: true });
  return true;
}
