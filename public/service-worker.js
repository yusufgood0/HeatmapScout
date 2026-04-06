const CACHE_NAME = "heatmap-cache-v1";

// Use import.meta.env.BASE_URL to get the correct base path
const BASE = self.location.origin + (self.__BASE_URL__ || "/HeatmapScout/");

// List of static assets to cache manually (optional)
const ASSETS_TO_CACHE = [
  BASE + "index.html",
  BASE + "background.png",
  BASE + "translations.json",
  BASE + "icons/icon-192.png",
  BASE + "icons/icon-512.png",
];

// Install event — cache everything
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

// Activate event — claim clients
self.addEventListener("activate", event => {
  event.waitUntil(self.clients.claim());
});

// Fetch event — respond from cache if available, otherwise fetch network
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) return cachedResponse;
      return fetch(event.request).catch(() => {
        // Optional: fallback if fetch fails
        if (event.request.destination === "document") {
          return caches.match(BASE + "index.html");
        }
      });
    })
  );
});