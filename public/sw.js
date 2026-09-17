// Service Worker del Family Day Planner.
//
// Las rutas de PRECACHE son RELATIVAS a la ubicación de este archivo, que vive
// en la raíz del despliegue (p. ej. /Planner/sw.js). Usar rutas absolutas
// ("/", "/index.html") hacía fallar `cache.addAll` con 404 en GitHub Pages y
// dejaba la app sin funcionamiento offline.

const CACHE_NAME = 'family-day-planner-v2';
const PRECACHE_ASSETS = ['./', './index.html', './manifest.webmanifest'];

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      // Precacheamos de una en una: `addAll` es atómico y un solo 404
      // (por ejemplo un recurso retirado) dejaría la caché vacía.
      await Promise.all(
        PRECACHE_ASSETS.map((asset) =>
          cache.add(new Request(asset, { cache: 'reload' })).catch(() => undefined)
        )
      );
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navegación: red primero (así llegan los despliegues nuevos) y caché como
  // respaldo cuando no hay conexión.
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request);
          const cache = await caches.open(CACHE_NAME);
          cache.put('./index.html', fresh.clone());
          return fresh;
        } catch {
          const cached = (await caches.match('./index.html')) || (await caches.match('./'));
          return cached || Response.error();
        }
      })()
    );
    return;
  }

  // Resto de recursos propios: caché primero, rellenando en segundo plano.
  event.respondWith(
    (async () => {
      const cached = await caches.match(request);
      if (cached) {
        fetch(request)
          .then((res) => {
            if (res && res.status === 200 && res.type === 'basic') {
              caches.open(CACHE_NAME).then((c) => c.put(request, res));
            }
          })
          .catch(() => undefined);
        return cached;
      }

      try {
        const res = await fetch(request);
        if (res && res.status === 200 && res.type === 'basic') {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(request, clone));
        }
        return res;
      } catch {
        return Response.error();
      }
    })()
  );
});