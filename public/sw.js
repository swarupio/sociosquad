/* SocioSquad service worker. Bump VERSION to invalidate caches. */
const VERSION = "v1";
const SHELL_CACHE = `sociosquad-shell-${VERSION}`;
const ASSET_CACHE = `sociosquad-assets-${VERSION}`;
const PRECACHE = ["/offline.html", "/manifest.webmanifest", "/favicon.ico", "/icons/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((c) => c.addAll(PRECACHE)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith("sociosquad-") && k !== SHELL_CACHE && k !== ASSET_CACHE)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

const AUTH_PATH = /^\/(auth|login|signup|reset-password|admin)(\/|$)/;

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Cross-origin (Supabase, tiles, etc.) is never intercepted.
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/rest/") || url.pathname.startsWith("/auth/v1")) return;

  if (req.mode === "navigate") {
    if (AUTH_PATH.test(url.pathname)) {
      event.respondWith(fetch(req).catch(() => caches.match("/offline.html")));
      return;
    }
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(SHELL_CACHE).then((c) => c.put("/", copy));
          }
          return res;
        })
        .catch(async () => (await caches.match("/")) || (await caches.match("/offline.html"))),
    );
    return;
  }

  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(
      caches.open(ASSET_CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        const network = fetch(req)
          .then((res) => {
            if (res.ok) cache.put(req, res.clone());
            return res;
          })
          .catch(() => cached);
        return cached || network;
      }),
    );
    return;
  }

  if (PRECACHE.includes(url.pathname)) {
    event.respondWith(caches.match(req).then((r) => r || fetch(req)));
  }
});
