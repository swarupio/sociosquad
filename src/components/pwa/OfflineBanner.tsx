import { useEffect, useState } from "react";

export function OfflineBanner() {
  const [online, setOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  return (
    <div aria-live="polite" role="status">
      {!online && (
        <div className="fixed inset-x-0 top-0 z-[100] bg-destructive px-4 py-2 text-center text-sm text-destructive-foreground">
          You are offline. Some features may be unavailable.
        </div>
      )}
    </div>
  );
}

export default OfflineBanner;
