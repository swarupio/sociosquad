const NOMINATIM_SEARCH = "https://nominatim.openstreetmap.org/search";

const MIN_INTERVAL_MS = 1100; // Nominatim policy: max 1 request/second
const HIT_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MISS_TTL_MS = 24 * 60 * 60 * 1000;
const STORAGE_PREFIX = "nominatim:v1:";

type NominatimResult = { lat?: string; lon?: string };
type Coords = { latitude: number | null; longitude: number | null };
type CacheEntry = { latitude: number | null; longitude: number | null; expires: number };
type GeocodeOptions = {
  signal?: AbortSignal;
  /** If the row already has coordinates, they are returned as-is without any request. */
  existing?: { latitude?: number | null; longitude?: number | null } | null;
};

const NONE: Coords = { latitude: null, longitude: null };

const memoryCache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<Coords>>();

let lastRequestAt = 0;
let queueTail: Promise<unknown> = Promise.resolve();
let blockedForSession = false;

const normalizeQuery = (q: string) => q.trim().toLowerCase().replace(/\s+/g, " ");

function readCache(key: string): Coords | null {
  const now = Date.now();
  const mem = memoryCache.get(key);
  if (mem) {
    if (mem.expires > now) return { latitude: mem.latitude, longitude: mem.longitude };
    memoryCache.delete(key);
  }
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry;
    if (!entry || typeof entry.expires !== "number" || entry.expires <= now) {
      localStorage.removeItem(STORAGE_PREFIX + key);
      return null;
    }
    memoryCache.set(key, entry);
    return { latitude: entry.latitude, longitude: entry.longitude };
  } catch {
    return null;
  }
}

function writeCache(key: string, coords: Coords) {
  const hit = coords.latitude != null && coords.longitude != null;
  const entry: CacheEntry = { ...coords, expires: Date.now() + (hit ? HIT_TTL_MS : MISS_TTL_MS) };
  memoryCache.set(key, entry);
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(entry));
  } catch {
    /* storage unavailable or full */
  }
}

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException("Aborted", "AbortError"));
    const t = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(t);
      reject(new DOMException("Aborted", "AbortError"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });

/** Serialize requests through a single queue, spaced by MIN_INTERVAL_MS. */
function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = queueTail.then(task, task);
  queueTail = run.catch(() => undefined);
  return run;
}

async function fetchCoords(query: string, signal?: AbortSignal): Promise<{ coords: Coords; cacheable: boolean }> {
  const wait = lastRequestAt + MIN_INTERVAL_MS - Date.now();
  if (wait > 0) await sleep(wait, signal);
  if (blockedForSession) return { coords: NONE, cacheable: false };
  lastRequestAt = Date.now();

  const url = new URL(NOMINATIM_SEARCH);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");

  const res = await fetch(url.toString(), {
    signal,
    headers: { Accept: "application/json", "Accept-Language": "en" },
  });

  if (res.status === 429) {
    // Back off: stop geocoding for the rest of this session.
    blockedForSession = true;
    return { coords: NONE, cacheable: false };
  }
  if (!res.ok) return { coords: NONE, cacheable: false }; // transient failure: not cached

  const data = (await res.json()) as NominatimResult[];
  const first = Array.isArray(data) ? data[0] : undefined;
  const latitude = first?.lat != null ? Number.parseFloat(first.lat) : NaN;
  const longitude = first?.lon != null ? Number.parseFloat(first.lon) : NaN;
  const coords: Coords =
    Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : NONE;
  return { coords, cacheable: true };
}

export async function geocodeLocation(
  location: string,
  city: string,
  options: GeocodeOptions = {}
): Promise<Coords> {
  const { signal, existing } = options;

  if (existing && existing.latitude != null && existing.longitude != null) {
    return { latitude: existing.latitude, longitude: existing.longitude };
  }

  const parts = [location?.trim(), city?.trim()].filter(Boolean);
  if (parts.length === 0) return NONE;

  const query = parts.join(", ");
  const key = normalizeQuery(query);

  const cached = readCache(key);
  if (cached) return cached;
  if (blockedForSession) return NONE;
  if (signal?.aborted) return NONE;

  const pending = inFlight.get(key);
  if (pending) return pending;

  // The shared request is intentionally not tied to one caller's signal so that
  // other callers deduped onto it are not cancelled; callers just stop waiting.
  const promise = enqueue(async () => {
    const again = readCache(key);
    if (again) return again;
    try {
      const { coords, cacheable } = await fetchCoords(query);
      // Cache hits and genuine misses (but not rate-limit / transient failures).
      if (cacheable) writeCache(key, coords);
      return coords;
    } catch {
      return NONE;
    }
  }).finally(() => {
    inFlight.delete(key);
  });
  inFlight.set(key, promise);

  if (!signal) return promise;
  return new Promise<Coords>((resolve) => {
    if (signal.aborted) return resolve(NONE);
    signal.addEventListener("abort", () => resolve(NONE), { once: true });
    promise.then(resolve, () => resolve(NONE));
  });
}
