// Bump this version on each deploy to bust the SW cache.
// Static assets are already content-hashed by Vite; this controls
// the navigation/HTML cache and precached shell files.
const CACHE_VERSION = 9;
const CACHE_NAME = `figgg-v${CACHE_VERSION}`;

// App shell files to precache (NOT index.html — navigation is network-first)
const PRECACHE_URLS = [
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/images/logo.png',
];

// Install: precache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    })
  );
  // Activate immediately
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  // Take control of all clients immediately
  self.clients.claim();
});

// Fetch strategy:
// - API calls: network-only (localStorage is the offline fallback)
// - Navigation (index.html): network-only with offline fallback
// - Static assets (JS/CSS/images): stale-while-revalidate (content-hashed filenames)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip Firebase/Firestore SDK requests — they handle their own caching
  if (url.hostname.includes('firestore.googleapis.com') ||
      url.hostname.includes('firebase') ||
      url.hostname.includes('googleapis.com')) {
    return;
  }

  // Network-only for navigation requests (HTML pages / SPA routes)
  // NEVER serve cached HTML — stale index.html references old JS bundles
  // which can contain broken code (e.g., missing Firestore save calls).
  // Offline fallback only kicks in when network is completely unavailable.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          // Truly offline: serve cached index.html as last resort
          return caches.match('/index.html')
            .then((cached) => cached || new Response('Offline — please reconnect and refresh.', {
              status: 503,
              headers: { 'Content-Type': 'text/plain' },
            }));
        })
    );
    return;
  }

  // Stale-while-revalidate for static assets (JS, CSS, images, fonts)
  // Safe because Vite uses content-hashed filenames (index-abc123.js)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          // Update cache with fresh response
          if (networkResponse.ok) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Return cached response if network fails
          return cachedResponse;
        });

      // Return cached response immediately if available, otherwise wait for network
      return cachedResponse || fetchPromise;
    })
  );
});

// Listen for messages from the app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
