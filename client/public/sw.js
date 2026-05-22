self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
// Satisfy the PWA installability requirement; no caching — the app uses localStorage.
self.addEventListener('fetch', () => {});
