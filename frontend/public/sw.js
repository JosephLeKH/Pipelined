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

  // Don't intercept cross-origin requests (e.g. logo.clearbit.com). Letting them
  // bubble up to the browser avoids "Uncaught (in promise) TypeError: Failed to
  // fetch" noise when those hosts 404 or block CORS.
  if (url.origin !== location.origin) return;

  // Network-only for all API requests — never serve stale data
  if (url.pathname.startsWith("/api/")) return;

  if (request.method !== "GET") return;

  // Network-first for SPA navigations (HTML documents) so a deploy is picked up
  // on the next reload. Cache-first would pin users to the bundle they first
  // loaded, even after we ship new JS.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put("/index.html", clone));
          }
          return response;
        })
        .catch(async () => {
          const shell = await caches.match("/index.html");
          if (shell) return shell;
          throw new Error("offline and no cached shell");
        }),
    );
    return;
  }

  // Cache-first for static assets (JS/CSS chunks, images, fonts).
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      });
    }),
  );
});
