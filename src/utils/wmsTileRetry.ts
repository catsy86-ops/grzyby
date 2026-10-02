import type { TileErrorEvent } from 'leaflet'

const MAX_WMS_TILE_RETRIES = 3

// Serwery WMS (zwłaszcza ortofotomapa GUGiK) losowo odpowiadają 404 na poprawne zapytania -
// pomiar 2026-10-02: ~40% prób, ten sam URL chwilę później daje 200. Bez ponowienia na mapie
// zostają szare dziury. Ponowne ustawienie `src` jest bezpieczne: Leaflet zostawia na <img>
// swoje onload/onerror, więc udane ponowienie normalnie oznacza kafel jako załadowany.
export function retryWmsTile(event: TileErrorEvent) {
  const img = event.tile as HTMLImageElement
  const attempt = Number(img.dataset.retry ?? 0) + 1
  if (attempt > MAX_WMS_TILE_RETRIES || !navigator.onLine) return
  img.dataset.retry = String(attempt)
  const url = new URL(img.src)
  url.searchParams.set('retry', String(attempt))
  setTimeout(() => {
    img.src = url.href
  }, 400 * attempt)
}
