// Odbiorca strony `share_target` (patrz sw.ts) - zdjęcie udostępnione z innej aplikacji (np.
// Galerii telefonu, "Udostępnij" -> Grzybobranie) trafia do Service Workera przez POST
// multipart/form-data, którego strona (fetch/XHR) nigdy nie widzi. SW nie ma dostępu do Dexie
// klienta ani łatwego sposobu przekazania Blob-a przez `postMessage` do karty, która może jeszcze
// nie istnieć (start z zamkniętej apki) - zamiast tego SW odkłada zdjęcie do Cache Storage pod
// stałym kluczem, a strona po starcie (patrz MapView.tsx) sama je stamtąd odbiera i czyści wpis.

export const SHARED_PHOTO_CACHE = 'shared-photo'
export const SHARED_PHOTO_CACHE_KEY = '/__shared-photo__'

export async function consumeSharedPhoto(): Promise<File | null> {
  if (!('caches' in window)) return null
  try {
    const cache = await caches.open(SHARED_PHOTO_CACHE)
    const match = await cache.match(SHARED_PHOTO_CACHE_KEY)
    if (!match) return null
    await cache.delete(SHARED_PHOTO_CACHE_KEY)
    const blob = await match.blob()
    const type = blob.type || 'image/jpeg'
    return new File([blob], 'udostepnione-zdjecie.jpg', { type })
  } catch {
    // Cache API niedostępne/awaria odczytu - po prostu brak zdjęcia, formularz otwiera się pusty
    // jak przy zwykłym skrócie "Dodaj znalezisko".
    return null
  }
}
