// Wersja cache'u
const CACHE_NAME = 'scenariusz-fiszki-v1';

// Pliki do cache'owania
const urlsToCache = [
  '/scenariusz-fiszki/',
  '/scenariusz-fiszki/index.html',
  '/scenariusz-fiszki/manifest.json',
  '/scenariusz-fiszki/favicon.png',
  '/scenariusz-fiszki/assets/index.js',
  '/scenariusz-fiszki/assets/index.css'
];

// Instalacja Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Otwieram cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Aktywacja Service Worker
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Nasłuchiwanie zapytań
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Zwróć z cache'u jeśli znaleziono
        if (response) {
          return response;
        }
        
        // Skopiuj zapytanie
        return fetch(event.request).then(
          response => {
            // Sprawdź czy otrzymaliśmy prawidłową odpowiedź
            if(!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Skopiuj odpowiedź
            var responseToCache = response.clone();
            
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          }
        );
      })
  );
});
