const CACHE_NAME = "heatmap-cache-v1";
const ASSETS_TO_CACHE = [
  "./index.html",
  "./main.js",
  "./styles.css" // optional
];

// Install event
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

// Fetch event (serve from cache if available)
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(resp => resp || fetch(event.request))
  );
});