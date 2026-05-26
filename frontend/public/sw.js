/**
 * Pipelined service worker.
 * Cache-first for app shell assets; network-only for /api/* requests.
 * Version is passed via query string (?v=<build-hash>) so the cache
 * is automatically invalidated when assets change.
 */

const CACHE_VERSION = new URLSearchParams(location.search).get("v") || "v1";
const CACHE_NAME = `pipelined-shell-${CACHE_VERSION}`;

const APP_SHELL = ["/", "/index.html"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Network-only for all API requests — never serve stale data
  if (url.pathname.startsWith("/api/")) return;

  // Cache-first for app shell and static assets
  if (request.method !== "GET") return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(async (err) => {
          // Network failed (QUIC drop, offline, etc.). For SPA navigations
          // fall back to the cached index.html so the app shell still loads
          // and React Router can take over. Otherwise rethrow so the browser
          // shows its normal network error UI for the specific resource.
          if (request.mode === "navigate") {
            const shell = await caches.match("/index.html");
            if (shell) return shell;
          }
          throw err;
        });
    })
  );
});
