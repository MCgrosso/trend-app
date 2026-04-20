// ═══════════════════════════════════════════════════════════════════════════
// TREND service worker — v2
// Strategies:
//   · Precache core shell on install
//   · Navigation requests         → network-first, falls back to cached shell
//   · Static assets (JS/CSS/img)  → cache-first, update in background
//   · Supabase API / auth         → never cached (always network)
// ═══════════════════════════════════════════════════════════════════════════

const VERSION        = "v2";
const STATIC_CACHE   = `trend-static-${VERSION}`;
const RUNTIME_CACHE  = `trend-runtime-${VERSION}`;
const CORE_ASSETS    = [
  "/",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
  "/offline.html",
];

// ── INSTALL ──────────────────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      // addAll is atomic — if one fails, nothing caches. Use individual adds so
      // a missing optional file (e.g. /offline.html) doesn't break install.
      await Promise.all(
        CORE_ASSETS.map((url) =>
          cache.add(url).catch(() => console.warn("[sw] skip", url))
        )
      );
    })()
  );
  self.skipWaiting();
});

// ── ACTIVATE ─────────────────────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE && k !== RUNTIME_CACHE)
          .map((k) => caches.delete(k))
      );
      // Enable navigation preload if available (faster first paint)
      if (self.registration.navigationPreload) {
        await self.registration.navigationPreload.enable();
      }
      await self.clients.claim();
    })()
  );
});

// ── HELPERS ──────────────────────────────────────────────────────────────────
function isSameOrigin(request) {
  return new URL(request.url).origin === self.location.origin;
}

function isSupabaseRequest(url) {
  return /supabase\.co/.test(url) || /supabase\.in/.test(url);
}

function isStaticAsset(url) {
  return /\.(?:js|css|woff2?|ttf|png|jpg|jpeg|svg|webp|ico|gif)$/.test(
    new URL(url).pathname
  );
}

// Network-first for HTML navigations — always try fresh, fall back to cache
async function networkFirst(request, preloadResponse) {
  const cache = await caches.open(RUNTIME_CACHE);
  try {
    const response = (await preloadResponse) || (await fetch(request));
    if (response && response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    const shell = await caches.match("/");
    if (shell) return shell;
    return caches.match("/offline.html");
  }
}

// Cache-first for static assets — instant, update in background
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    // Revalidate quietly in background
    fetch(request)
      .then((fresh) => {
        if (fresh && fresh.ok) {
          caches.open(RUNTIME_CACHE).then((c) => c.put(request, fresh.clone()));
        }
      })
      .catch(() => {});
    return cached;
  }
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.ok && fresh.type !== "opaque") {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, fresh.clone());
    }
    return fresh;
  } catch {
    return Response.error();
  }
}

// ── FETCH ────────────────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = request.url;

  // Skip Supabase API/auth — always hit network directly
  if (isSupabaseRequest(url)) return;

  // Skip cross-origin requests (e.g. Google Fonts) — let browser cache handle
  if (!isSameOrigin(request)) return;

  // Navigation: network-first
  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, event.preloadResponse));
    return;
  }

  // Static assets: cache-first
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Everything else same-origin: stale-while-revalidate
  event.respondWith(
    (async () => {
      const cached = await caches.match(request);
      const fetchPromise = fetch(request)
        .then((response) => {
          if (response && response.ok) {
            caches
              .open(RUNTIME_CACHE)
              .then((c) => c.put(request, response.clone()));
          }
          return response;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })()
  );
});

// Allow the client to trigger skipWaiting (for "update available" prompts)
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
