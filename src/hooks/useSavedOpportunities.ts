import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "sociosquad:saved-opportunities";
const listeners = new Set<() => void>();
const EMPTY: readonly string[] = [];

let cache: readonly string[] | null = null;

function read(): readonly string[] {
  if (cache) return cache;
  try {
    const raw = typeof localStorage === "undefined" ? null : localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    cache = Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : EMPTY;
  } catch {
    cache = EMPTY;
  }
  return cache;
}

function write(next: readonly string[]) {
  cache = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable (private mode / quota): keep in-memory state only */
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      cache = null;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** Bookmarked opportunity ids, persisted locally and synced across tabs and components. */
export function useSavedOpportunities() {
  const saved = useSyncExternalStore(subscribe, read, () => EMPTY);

  const isSaved = useCallback((id: string) => saved.includes(id), [saved]);
  const toggle = useCallback((id: string) => {
    const current = read();
    write(current.includes(id) ? current.filter((v) => v !== id) : [...current, id]);
  }, []);

  return { saved, isSaved, toggle };
}

/** Test helper: reset module cache. */
export function __resetSavedOpportunitiesCache() {
  cache = null;
}
