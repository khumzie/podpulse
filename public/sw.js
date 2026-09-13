const CACHE_NAME = 'podpulse-cache-v5';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './apple-touch-icon.png',
  './apple-touch-icon-180x180.png',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable.png',
  './icon.svg',
  './data/sixminutes.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip caching cross-origin audio streaming directly through SW to avoid range request issues,
  // audio downloads for offline playback are managed via IndexedDB!
  if (event.request.destination === 'audio' || url.pathname.endsWith('.mp3')) {
    return;
  }

  // Navigation: Fast cache fallback so app opens instantly on iPhone even when PC is shut down
  if (event.request.mode === 'navigate') {
    event.respondWith(
      // Try fast network with 1200ms timeout, then fall back immediately to cached index.html
      Promise.race([
        fetch(event.request),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Network timeout')), 1200))
      ])
      .catch(() => {
        return caches.match('/index.html').then((res) => res || caches.match('/'));
      })
    );
    return;
  }

  // Cache-First for static assets, network fallback & dynamic caching
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request)
        .then((networkResponse) => {
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            event.request.method === 'GET' &&
            (url.origin === location.origin || url.hostname.includes('fonts.gstatic.com') || url.hostname.includes('fonts.googleapis.com'))
          ) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          return new Response('Network offline', { status: 503, statusText: 'Offline' });
        });
    })
  );
});
