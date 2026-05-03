// Iron Logic — Service Worker
// Strategy: Network-first for app shell, Cache-first for fonts.
// Auth and Drive API requests are always bypassed — never cached.
//
// To deploy a new version: increment CACHE_NAME to 'IRON_LOGIC_V2'.
// The activate handler deletes all caches that don't match CACHE_NAME.

// V2: roadmap dashboard added at /workout/dashboard/. Bumping the cache name
// forces any installed clients to drop V1 caches on activate so the new
// integrated shell (with the Roadmap link in the picker header) replaces the
// old one cleanly.
const CACHE_NAME = 'IRON_LOGIC_V2';

// Fetched and cached immediately on SW install.
// Only the app shell — no auth assets, no API endpoints.
const PRECACHE_URLS = [
  '/workout/',
];

// Requests from these hostnames are never intercepted.
// Covers: Google Sign-In, OAuth token endpoints.
const BYPASS_HOSTNAMES = new Set([
  'accounts.google.com',
  'oauth2.googleapis.com',
]);

// Requests whose URLs start with these prefixes are never intercepted.
// Covers: Drive REST API, Drive upload API.
const BYPASS_URL_PREFIXES = [
  'https://www.googleapis.com/drive/',
  'https://www.googleapis.com/upload/drive/',
];

// Google Fonts are content-addressed and safe to cache indefinitely.
const FONT_HOSTNAMES = new Set([
  'fonts.googleapis.com',
  'fonts.gstatic.com',
]);

// ── Install ────────────────────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate ───────────────────────────────────────────────────────────────
// Delete every cache that isn't CACHE_NAME.
// This is the safe moment: all old clients have been replaced.
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch ──────────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;

  // Only handle GET. Let the browser own POST/PUT/PATCH/DELETE.
  if (request.method !== 'GET') return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return; // unparseable URL — pass through
  }

  // Never intercept auth or Drive API traffic.
  if (BYPASS_HOSTNAMES.has(url.hostname)) return;
  if (BYPASS_URL_PREFIXES.some(prefix => request.url.startsWith(prefix))) return;

  // ── Cache-first: Google Fonts ──────────────────────────────────────────
  // Fonts are content-addressed by Google; stale risk is zero.
  if (FONT_HOSTNAMES.has(url.hostname)) {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache =>
        cache.match(request).then(cached => {
          if (cached) return cached;
          return fetch(request).then(response => {
            if (response.ok) cache.put(request, response.clone());
            return response;
          });
        })
      )
    );
    return;
  }

  // ── Network-first: everything else in scope ────────────────────────────
  // On network success: update the cache silently.
  // On network failure: serve the cached version.
  // Final fallback: serve the app shell so navigation never hard-fails.
  //
  // Stale-data tradeoff: a cached index.html may be up to one navigation
  // cycle behind a new deployment. Network-first mitigates this — the SW
  // only serves cache when the network is genuinely unreachable.
  event.respondWith(
    fetch(request)
      .then(response => {
        if (response.ok && url.origin === self.location.origin) {
          caches.open(CACHE_NAME)
            .then(cache => cache.put(request, response.clone()));
        }
        return response;
      })
      .catch(() =>
        caches.match(request)
          .then(cached => cached || caches.match('/workout/'))
      )
  );
});
