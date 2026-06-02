/* Temrin SW — cache-first, sürüm değişince eski cache temizlenir */
const VERSION = 'temrin-v3';
// Çekirdek: bunlar mutlaka önbelleğe alınmalı (uygulama + veri)
const CORE = [
  './',
  './app.html',
  './cografya.js',
  './manifest.webmanifest'
];
// İsteğe bağlı: yolu yanlışsa/yoksa precache'i çökertmesin
const OPTIONAL = [
  './icon-192.png',
  './icon-512.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/favicon.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSION);
    // Çekirdek dosyalar tek tek (biri patlarsa diğerleri yine de insin)
    await Promise.all(CORE.map((u) => c.add(u).catch(() => {})));
    // İsteğe bağlılar best-effort
    await Promise.allSettled(OPTIONAL.map((u) => c.add(u)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((hit) => {
      if (hit) return hit;
      return fetch(e.request).then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(e.request, copy));
        }
        return res;
      }).catch(() => {
        if (e.request.mode === 'navigate') return caches.match('./app.html');
        return new Response('', { status: 504, statusText: 'offline' });
      });
    })
  );
});
