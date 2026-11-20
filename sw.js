// Service worker: precached app shell, cache-first assets, network-first manifest; basemap parts bypass.
const VERSION = '2026-11-20T05:24:25.542Z';
const SHELL_CACHE = `shell-${VERSION}`;
const ASSET_CACHE = 'assets-v1';
const SHELL = ["./","index.html","app.js","download-worker.js","styles.css","manifest.webmanifest","icon.svg","icon-180.png","vendor/maplibre-gl.mjs","vendor/maplibre-gl-worker.mjs","vendor/maplibre-gl.css"];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL.map((p) => new URL(p, self.registration.scope)))));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('shell-') && k !== SHELL_CACHE).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (request.headers.has('range') || url.pathname.includes('/data/basemap/')) return;
  if (request.mode === 'navigate') return event.respondWith(networkFirst(request, new URL('index.html', self.registration.scope)));
  if (url.pathname.endsWith('/data/manifest.json')) return event.respondWith(networkFirst(request, request));
  event.respondWith(cacheFirst(request));
});

async function networkFirst(request, fallbackKey) {
  try {
    const response = await fetch(request);
    if (response.ok) (await caches.open(ASSET_CACHE)).put(request, response.clone());
    return response;
  } catch {
    return (await caches.match(request, { ignoreSearch: true })) ?? (await caches.match(fallbackKey)) ?? Response.error();
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request, { ignoreSearch: true });
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) (await caches.open(ASSET_CACHE)).put(request, response.clone());
  return response;
}
