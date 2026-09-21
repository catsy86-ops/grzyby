/// <reference lib="webworker" />
// Ręczny Service Worker (tryb `injectManifest` w vite.config.ts) - zastępuje domyślny,
// wygenerowany deklaratywnie `generateSW`. Migracja była konieczna wyłącznie po to, by dodać
// fetch-handler dla PWA `share_target` (patrz manifest.share_target w vite.config.ts) -
// przechwycenie POST-a z `multipart/form-data`, gdy ktoś "Udostępnia" zdjęcie z innej apki do
// Grzybobrania, jest niemożliwe w deklaratywnym `generateSW`. Poza tym jednym handlerem zachowuje
// dokładnie taki sam precache app-shellu i runtimeCaching (kafle map, model AI) jak wcześniej.

import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { CacheFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'
import { SHARED_PHOTO_CACHE, SHARED_PHOTO_CACHE_KEY } from './utils/sharedPhoto'

declare let self: ServiceWorkerGlobalScope

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// Ten sam cache/parametry co poprzednio deklaratywny workbox.runtimeCaching w vite.config.ts -
// oba warianty podkładu mapy (standard OSM + terenowy OpenTopoMap, patrz src/data/mapLayers.ts)
// tym samym cache'em.
registerRoute(
  ({ url }) => /^https:\/\/[abc]\.tile\.(openstreetmap|opentopomap)\.org\/.*/i.test(url.href),
  new CacheFirst({
    cacheName: 'map-tiles',
    plugins: [
      new ExpirationPlugin({ maxEntries: 4000, maxAgeSeconds: 60 * 60 * 24 * 90 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  }),
)

registerRoute(
  ({ url }) => /\/models\/.*/i.test(url.pathname),
  new CacheFirst({
    cacheName: 'ai-model',
    plugins: [new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 365 })],
  }),
)

// share_target: przeglądarka POST-uje tu multipart/form-data z udostępnionym plikiem, zanim karta
// apki w ogóle istnieje (np. udostępnienie z Galerii, gdy Grzybobranie jest zamknięte). Zdjęcie
// odkładane jest do Cache Storage pod stałym kluczem (bo SW nie ma dostępu do Dexie klienta ani
// pewności, że jakaś karta odbierze `postMessage`) - strona odbiera je po starcie, patrz
// src/utils/sharedPhoto.ts i wywołanie w MapView.tsx. Kończy się przekierowaniem (303, żeby
// przeglądarka zrobiła GET zamiast ponownego POST-a) do `/?open=add-finding&shared=1`, ten sam
// wpisowy URL co skrót PWA "Dodaj znalezisko", plus flaga `shared`.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (event.request.method === 'POST' && url.pathname === '/share-target') {
    event.respondWith(handleShareTarget(event.request))
  }
})

async function handleShareTarget(request: Request): Promise<Response> {
  try {
    const formData = await request.formData()
    const file = formData.get('photo')
    if (file instanceof File && file.size > 0) {
      const cache = await caches.open(SHARED_PHOTO_CACHE)
      await cache.put(SHARED_PHOTO_CACHE_KEY, new Response(file, { headers: { 'Content-Type': file.type } }))
      return Response.redirect('/?open=add-finding&shared=1', 303)
    }
  } catch {
    // Nieprawidłowy/brakujący plik - po prostu wraca do formularza bez zdjęcia, jak zwykły skrót.
  }
  return Response.redirect('/?open=add-finding', 303)
}
