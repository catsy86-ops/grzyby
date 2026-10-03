/// <reference lib="webworker" />
// Ręczny Service Worker (tryb `injectManifest` w vite.config.ts) - zastępuje domyślny,
// wygenerowany deklaratywnie `generateSW`. Migracja była konieczna wyłącznie po to, by dodać
// fetch-handler dla PWA `share_target` (patrz manifest.share_target w vite.config.ts) -
// przechwycenie POST-a z `multipart/form-data`, gdy ktoś "Udostępnia" zdjęcie z innej apki do
// Grzybobrania, jest niemożliwe w deklaratywnym `generateSW`. Poza tym jednym handlerem zachowuje
// dokładnie taki sam precache app-shellu i runtimeCaching (kafle map, model AI) jak wcześniej.

import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { CacheFirst, NetworkFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'
import { SHARED_PHOTO_CACHE, SHARED_PHOTO_CACHE_KEY } from './utils/sharedPhoto'
import {
  getOverlayCachePolicy,
  isBaseMapTileRequest,
  isLegacyOsmTileUrl,
  MAP_OVERLAYS_CACHE_NAME,
  MAP_OVERLAYS_SHORT_CACHE_NAME,
  mapTileCacheKey,
  overlayCacheKey,
} from './data/mapLayers'

declare let self: ServiceWorkerGlobalScope

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// Ten sam cache/parametry co poprzednio deklaratywny workbox.runtimeCaching w vite.config.ts -
// oba warianty podkładu mapy (standard OSM + terenowy OpenTopoMap, patrz src/data/mapLayers.ts)
// tym samym cache'em. Klucz bez subdomeny a/b/c (mapTileCacheKey) - inaczej kafle pobrane przez
// "Pobierz obszar offline" (zapisane pod "a") nie trafiały, gdy Leaflet prosił o nie przez "b"/"c".
registerRoute(
  ({ url }) => isBaseMapTileRequest(url),
  new CacheFirst({
    cacheName: 'map-tiles',
    plugins: [
      { cacheKeyWillBeUsed: async ({ request }) => mapTileCacheKey(new URL(request.url)) },
      new ExpirationPlugin({ maxEntries: 4000, maxAgeSeconds: 60 * 60 * 24 * 90 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  }),
)

// Nakładki (Drzewostany, Obszary chronione, Szlaki) - osobny cache, żeby dało się go wyczyścić
// niezależnie od pobranych obszarów podkładu. Tylko 200: kafle są pobierane z `crossOrigin`
// (MapTileLayers.tsx), więc nie ma tu nieprzezroczystych odpowiedzi, które Chrome liczy do limitu
// pamięci po kilka MB każdą.
registerRoute(
  ({ url }) => getOverlayCachePolicy(url) === 'long',
  new CacheFirst({
    cacheName: MAP_OVERLAYS_CACHE_NAME,
    plugins: [
      { cacheKeyWillBeUsed: async ({ request }) => overlayCacheKey(new URL(request.url)) },
      new ExpirationPlugin({ maxEntries: 3000, maxAgeSeconds: 60 * 60 * 24 * 60 }),
      new CacheableResponsePlugin({ statuses: [200] }),
    ],
  }),
)

// Nakładki zmienne z dnia na dzień (zakazy wstępu, zagrożenie pożarowe - `cache: 'short'` w
// mapLayers.ts): zawsze najpierw sieć, a cache tylko jako zapas bez zasięgu i najwyżej z ostatniej
// doby. Zakaz sprzed tygodni pokazany offline byłby gorszy niż brak warstwy.
registerRoute(
  ({ url }) => getOverlayCachePolicy(url) === 'short',
  new NetworkFirst({
    cacheName: MAP_OVERLAYS_SHORT_CACHE_NAME,
    networkTimeoutSeconds: 5,
    plugins: [
      { cacheKeyWillBeUsed: async ({ request }) => overlayCacheKey(new URL(request.url)) },
      new ExpirationPlugin({ maxEntries: 1000, maxAgeSeconds: 60 * 60 * 24 }),
      new CacheableResponsePlugin({ statuses: [200] }),
    ],
  }),
)

// Faza 30 krok 2: OSM przeszedł z {s}.tile.openstreetmap.org na tile.openstreetmap.org. Kafle zapisane
// pod starym adresem nie trafią już nigdy (inny klucz), więc zwalniamy po nich miejsce - obszary offline
// trzeba pobrać ponownie. Przy kolejnych aktywacjach to tylko przejrzenie listy kluczy.
self.addEventListener('activate', (event) => {
  event.waitUntil(removeLegacyOsmTiles())
})

async function removeLegacyOsmTiles(): Promise<void> {
  const cache = await caches.open('map-tiles')
  const keys = await cache.keys()
  await Promise.all(keys.filter((request) => isLegacyOsmTileUrl(new URL(request.url))).map((request) => cache.delete(request)))
}

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
