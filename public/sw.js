// ═══════════════════════════════════════════════════════════════════════════
// TREND service worker — v3
// Strategy: minimal interception
//   · Precache the offline shell
//   · Static assets (js/css/fonts/img) → cache-first with background revalidate
//   · EVERYTHING ELSE → pass through to network untouched (no respondWith)
//
// Reasons:
//   · Server Actions (POST + Next-Action header) MUST hit the network without
//     interception, otherwise body/clone races break them silently.
//   · Dynamic routes like /duelos/* and the RSC payloads behind them carry
//     state we never want to serve stale.
// ═══════════════════════════════════════════════════════════════════════════

const VERSION       = "v3";
const STATIC_CACHE  = `trend-static-${VERSION}`;
const RUNTIME_CACHE = `trend-runtime-${VERSION}`;
const CORE_ASSETS   = [
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
      await self.clients.claim();
    })()
  );
});

// ── HELPERS ──────────────────────────────────────────────────────────────────
function isSameOrigin(request) {
  try {
    return new URL(request.url).origin === self.location.origin;
  } catch {
    return false;
  }
}

function isStaticAsset(url) {
  return /\.(?:js|mjs|css|woff2?|ttf|otf|eot|png|jpg|jpeg|svg|webp|ico|gif|mp3|ogg|wav)$/i.test(
    new URL(url).pathname
  );
}

// Cache-first for static assets — instant, update in background
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    // Background revalidate — fire and forget, fully isolated from the response
    fetch(request)
      .then(async (fresh) => {
        if (fresh && fresh.ok && fresh.type !== "opaque") {
          const cache = await caches.open(RUNTIME_CACHE);
          await cache.put(request, fresh.clone());
        }
      })
      .catch(() => {});
    return cached;
  }
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.ok && fresh.type !== "opaque") {
      // Clone BEFORE returning — fully synchronous before any consumer reads
      const cache = await caches.open(RUNTIME_CACHE);
      await cache.put(request, fresh.clone());
    }
    return fresh;
  } catch {
    return Response.error();
  }
}

// ── FETCH ────────────────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // 1. Never intercept non-GET (Server Actions are POST)
  if (request.method !== "GET") return;

  // 2. Never intercept Next.js Server Actions (POST + Next-Action header,
  //    but defensive: also skip GET with this header just in case)
  if (request.headers.get("Next-Action")) return;

  // 3. Never intercept Next.js RSC payloads (dynamic React Server Component data)
  if (request.headers.get("RSC")) return;
  if (request.headers.get("Next-Router-Prefetch")) return;
  if (request.headers.get("Next-Router-State-Tree")) return;

  // 4. Cross-origin → let the browser handle it
  if (!isSameOrigin(request)) return;

  const url = new URL(request.url);

  // 5. Never intercept dynamic app routes — duels, story mode, profiles, etc.
  if (url.pathname.startsWith("/duelos/"))  return;
  if (url.pathname.startsWith("/historia")) return;
  if (url.pathname.startsWith("/perfil/"))  return;
  if (url.pathname.startsWith("/api/"))     return;
  if (url.pathname.startsWith("/_next/data/")) return;
  // RSC payloads come back from page URLs with ?_rsc=… query param
  if (url.searchParams.has("_rsc")) return;

  // 6. ONLY intercept static assets — everything else goes to the network untouched
  if (isStaticAsset(request.url)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Default: do not call respondWith → request flows to the network normally
});

// Allow the client to trigger skipWaiting (for "update available" prompts)
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
