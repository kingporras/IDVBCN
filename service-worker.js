const CACHE_NAME = 'inter-app-cache-v11';
const APP_ASSETS = [
  './',
  'index.html',
  'style.css',
  'script.js',
  'data.json',
  'manifest.json',
  'escudo.png',
  'fondo.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys
        .filter((key) => key !== CACHE_NAME)
        .map((key) => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data?.type === 'CLEAR_APP_CACHE') {
    event.waitUntil(
      caches.keys().then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith('inter-app-cache'))
          .map((key) => caches.delete(key))
      ))
    );
  }
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw new Error('Network and cache miss');
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  cache.put(request, response.clone());
  return response;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;
  const pathname = url.pathname;

  const isHtml = request.mode === 'navigate' || pathname.endsWith('/index.html') || pathname === '/';
  const isScript = pathname.endsWith('/script.js');
  const isStyle = pathname.endsWith('/style.css');
  const isStaticMedia = /\.(?:png|jpg|jpeg|svg|webp|gif|ico|woff2?|ttf|otf)$/i.test(pathname);

  if (sameOrigin && (isHtml || isScript || isStyle)) {
    event.respondWith(networkFirst(request));
    return;
  }

  if (sameOrigin && isStaticMedia) {
    event.respondWith(cacheFirst(request));
    return;
  }

  event.respondWith(
    caches.match(request).then((response) => response || fetch(request))
  );
});
