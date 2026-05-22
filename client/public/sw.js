// Tsundoku service worker.
// The app shell is left to normal network/HTTP-cache handling (data lives in
// localStorage + IndexedDB). The only thing cached here is the Tesseract OCR
// asset set, so "Scan title from cover" works fully offline.

const CACHE = 'tsundoku-ocr-v1';

// Paths are relative to the SW scope, so this works under both '/' and the
// GitHub Pages '/tsundoku/' base. main.tsx registers the SW with a BASE-aware URL.
const OCR_ASSETS = [
  'tesseract/worker.min.js',
  'tesseract/tesseract-core-simd-lstm.wasm.js',
  'tesseract/eng.traineddata',
  'tesseract/dan.traineddata',
  'tesseract/jpn.traineddata',
];

const isOcrAsset = (url) => new URL(url).pathname.includes('/tesseract/');

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // Per-file, not cache.addAll: one failed fetch over a flaky connection must
    // not abort the whole install. Missing files fall back to cache-on-first-fetch.
    await Promise.allSettled(OCR_ASSETS.map(async (rel) => {
      const url = new URL(rel, self.registration.scope).href;
      const resp = await fetch(url, {cache: 'reload'});
      if (resp.ok) await cache.put(url, resp.clone());
    }));
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter((k) => k.startsWith('tsundoku-ocr-') && k !== CACHE)
        .map((k) => caches.delete(k)),
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  // Only intercept the OCR assets; everything else uses the network as before.
  if (e.request.method !== 'GET' || !isOcrAsset(e.request.url)) return;
  e.respondWith((async () => {
    const cached = await caches.match(e.request);
    if (cached) return cached;
    const resp = await fetch(e.request);
    if (resp.ok) {
      const cache = await caches.open(CACHE);
      cache.put(e.request, resp.clone());
    }
    return resp;
  })());
});
