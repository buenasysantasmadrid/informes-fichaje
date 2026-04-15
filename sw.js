const CACHE_NAME = 'fichajes-bys-v1';
const ASSETS = [
  './index.html',
  './manifest.json'
];

// Instalar: cachear recursos base
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// Activar: limpiar caches viejas
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

// Fetch: network first, cache fallback
// Las llamadas al Apps Script siempre van a red (son dinámicas)
self.addEventListener('fetch', function(e) {
  var url = e.request.url;

  // Requests al Apps Script: siempre red, nunca cache
  if (url.indexOf('script.google.com') !== -1) {
    e.respondWith(fetch(e.request).catch(function() {
      return new Response(JSON.stringify({ ok: false, msg: 'Sin conexión' }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }));
    return;
  }

  // Google Fonts: cache first
  if (url.indexOf('fonts.googleapis.com') !== -1 || url.indexOf('fonts.gstatic.com') !== -1) {
    e.respondWith(
      caches.match(e.request).then(function(cached) {
        return cached || fetch(e.request).then(function(response) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) { cache.put(e.request, clone); });
          return response;
        });
      })
    );
    return;
  }

  // cdnjs (xlsx): cache first
  if (url.indexOf('cdnjs.cloudflare.com') !== -1) {
    e.respondWith(
      caches.match(e.request).then(function(cached) {
        return cached || fetch(e.request).then(function(response) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) { cache.put(e.request, clone); });
          return response;
        });
      })
    );
    return;
  }

  // Resto (index.html, manifest): network first, cache fallback
  e.respondWith(
    fetch(e.request).then(function(response) {
      var clone = response.clone();
      caches.open(CACHE_NAME).then(function(cache) { cache.put(e.request, clone); });
      return response;
    }).catch(function() {
      return caches.match(e.request);
    })
  );
});
