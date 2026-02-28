
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open('inter-app-cache').then(cache => {
      return cache.addAll([
        './',
        'index.html',
        'style.css',
        'script.js',
        'data.json',
        'manifest.json',
        'escudo.png'
      ]);
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});
