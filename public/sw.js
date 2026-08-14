// Service worker de la app del cuidador. Alcance: solo /cuidador/* (se
// registra con scope explícito — ver src/components/service-worker-registro.tsx).
// Estrategia: red primero, caché como resguardo. No precachea una lista fija
// de archivos (los chunks de Next llevan hash en el nombre, precachearlos a
// mano sería frágil) — cachea sobre la marcha cada GET exitoso.

const CACHE_NAME = "hematopass-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Nunca interceptar mutaciones: los Server Actions viajan como POST, y
  // cachear o reintentar eso a ciegas sería peligroso (duplicaría escaneos
  // o pasos). El offline de escritura se resuelve aparte, con la cola en
  // IndexedDB (src/lib/offline-queue.ts), no con el service worker.
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    (async () => {
      try {
        const respuestaRed = await fetch(request);
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, respuestaRed.clone());
        return respuestaRed;
      } catch {
        const enCache = await caches.match(request);
        if (enCache) return enCache;
        if (request.mode === "navigate") {
          const shell = await caches.match("/cuidador/ahora");
          if (shell) return shell;
        }
        throw new Error("offline-sin-cache-disponible");
      }
    })()
  );
});
