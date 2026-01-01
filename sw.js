const CACHE_NAME = 'orto-sotto-casa-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './shop.js',
  './config.js',
  './logo-AllegroFattore.png',
  './manifest.json'
];

// Installazione: scarica i file nella cache
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(ASSETS_TO_CACHE);
      })
  );
});

// Attivazione: pulisce vecchie cache
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          return caches.delete(key);
        }
      }));
    })
  );
});

// Fetch: serve i file dalla cache se offline
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        return response || fetch(event.request);
      })
  );
});