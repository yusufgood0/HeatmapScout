const CACHE_NAME = "heatmap-cache-v1";

// Base path for GitHub Pages
const BASE = self.location.origin + (self.__BASE_URL__ || "/HeatmapScout/");

// Static assets to precache
const ASSETS_TO_CACHE = [
  BASE + "index.html",
  BASE + "background.png",
  BASE + "translations.json",
  BASE + "icons/icon-192.png",
  BASE + "icons/icon-512.png",
];

// Helper function to cache a Response
async function cacheResponse(url, data) {
  if ("caches" in self) {
    const cache = await caches.open(CACHE_NAME);
    const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
    const responseToCache = new Response(blob, { status: 200, statusText: "OK" });
    await cache.put(url, responseToCache);
  }
}

// Install event — precache static assets
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

// Activate event
self.addEventListener("activate", event => {
  event.waitUntil(self.clients.claim());
});

// Fetch event
self.addEventListener("fetch", event => {
  const url = event.request.url;

  // Handle Google Sheets requests separately
  if (url.includes("sheets.googleapis.com")) {
    event.respondWith(
      fetch(event.request)
        .then(async networkResponse => {
          // Clone and cache network response
          const data = await networkResponse.clone().json();
          cacheResponse(url, data);
          return networkResponse;
        })
        .catch(async () => {
          // Network failed → serve cached sheet data if available
          const cache = await caches.open(CACHE_NAME);
          const cached = await cache.match(url);
          if (cached) {
            const cachedData = await cached.json();
            return new Response(JSON.stringify(cachedData), {
              headers: { "Content-Type": "application/json" },
            });
          }
          return new Response(JSON.stringify({ error: "Offline and no cache" }), {
            status: 503,
            headers: { "Content-Type": "application/json" },
          });
        })
    );
    return;
  }

  // Default: serve from cache first, fallback to network
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) return cachedResponse;
      return fetch(event.request).catch(() => {
        if (event.request.destination === "document") {
          return caches.match(BASE + "index.html");
        }
      });
    })
  );
});