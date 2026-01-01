const CACHE_NAME = 'orto-sotto-casa-v2';
const ASSETS_TO_CACHE = [
  'index.html',
  'tyle.css',
  'hop.js',
  'config.js',
  'logo-AllegroFattore.png',
  'manifest.json'
];

// Installazione: scarica i file
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        // Tenta di aggiungere i file uno alla volta per capire quale fallisce (visibile in console)
        return Promise.all(
          ASSETS_TO_CACHE.map(url => {
            return cache.add(url).catch(error => {
              console.error('Impossibile caricare il file:', url, error);
            });
          })
        );
      })
  );
});

// Attivazione e pulizia
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

// Fetch
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        return response || fetch(event.request);
      })
  );

});
