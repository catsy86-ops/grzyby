// Pobieranie kafelków mapy do trybu offline - zapisuje bezpośrednio do tego samego
// cache'a ('map-tiles'), którego używa runtime CacheFirst w konfiguracji PWA (vite.config.ts),
// więc Service Worker later serwuje te same kafelki bez dodatkowej konfiguracji.

export interface TileCoord {
  z: number
  x: number
  y: number
}

export const OFFLINE_ZOOM_MIN = 13
// z17 (poziom budynków) mnożyłby liczbę kafelków ~4x względem z16 przy marginalnej korzyści dla
// nawigacji pieszej - z16 (poziom ulic) wystarcza i mieści największy preset (10 km) w limicie.
export const OFFLINE_ZOOM_MAX = 16

export const OFFLINE_RADIUS_PRESETS = [
  { label: '2 km', km: 2 },
  { label: '5 km', km: 5 },
  { label: '10 km', km: 10 },
] as const

const TILE_URL = (z: number, x: number, y: number) => `https://maps.wikimedia.org/osm-intl/${z}/${x}/${y}.png`
const MAP_TILES_CACHE_NAME = 'map-tiles'
// Największy preset (10 km, zoom 13-16) to ok. 3940 kafelków - limit z marginesem na nieregularne
// kształty obszaru przy różnych szerokościach geograficznych.
const MAX_TILES_PER_DOWNLOAD = 4500
const CONCURRENCY = 6
// Heurystyka do szacowania rozmiaru pobierania przed startem - realne kafelki PNG bywają 5-40 KB.
const AVG_TILE_BYTES = 20 * 1024

function lonToTileX(lon: number, zoom: number): number {
  return Math.floor(((lon + 180) / 360) * 2 ** zoom)
}

function latToTileY(lat: number, zoom: number): number {
  const latRad = (lat * Math.PI) / 180
  return Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * 2 ** zoom)
}

export function computeTilesForArea(
  center: [number, number],
  radiusKm: number,
  zoomMin: number = OFFLINE_ZOOM_MIN,
  zoomMax: number = OFFLINE_ZOOM_MAX,
): TileCoord[] {
  const [lat, lon] = center
  const kmPerDegLat = 111.32
  const kmPerDegLon = 111.32 * Math.cos((lat * Math.PI) / 180)
  const deltaLat = radiusKm / kmPerDegLat
  const deltaLon = radiusKm / Math.max(kmPerDegLon, 1e-6)

  const north = lat + deltaLat
  const south = lat - deltaLat
  const east = lon + deltaLon
  const west = lon - deltaLon

  const tiles: TileCoord[] = []
  for (let z = zoomMin; z <= zoomMax; z++) {
    const xMin = lonToTileX(west, z)
    const xMax = lonToTileX(east, z)
    const yMin = latToTileY(north, z)
    const yMax = latToTileY(south, z)
    for (let x = xMin; x <= xMax; x++) {
      for (let y = yMin; y <= yMax; y++) {
        tiles.push({ z, x, y })
      }
    }
  }
  return tiles
}

export function estimateDownloadSizeBytes(tileCount: number): number {
  return tileCount * AVG_TILE_BYTES
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export const MAX_OFFLINE_TILES = MAX_TILES_PER_DOWNLOAD

export interface DownloadProgress {
  downloaded: number
  total: number
  failed: number
}

export interface DownloadResult extends DownloadProgress {
  // Konkretne kafelki, które nie zapisały się w tej próbie - pozwala UI zaoferować "Ponów
  // nieudane" zamiast całego obszaru od nowa (choć ponowienie całości i tak jest tanie dzięki
  // `cache.match` niżej - to tylko jaśniejszy sygnał dla użytkownika, co realnie się nie udało).
  failedTiles: TileCoord[]
}

export async function downloadTilesForOfflineUse(
  tiles: TileCoord[],
  onProgress?: (progress: DownloadProgress) => void,
  signal?: AbortSignal,
): Promise<DownloadResult> {
  if (tiles.length > MAX_TILES_PER_DOWNLOAD) {
    throw new Error(
      `Zbyt duży obszar (${tiles.length} kafelków, limit ${MAX_TILES_PER_DOWNLOAD}) - wybierz mniejszy promień.`,
    )
  }

  const cache = await caches.open(MAP_TILES_CACHE_NAME)
  let downloaded = 0
  const failedTiles: TileCoord[] = []
  const total = tiles.length
  let nextIndex = 0

  async function worker() {
    while (nextIndex < tiles.length) {
      if (signal?.aborted) return
      const tile = tiles[nextIndex++]
      const url = TILE_URL(tile.z, tile.x, tile.y)
      try {
        const alreadyCached = await cache.match(url)
        if (!alreadyCached) {
          const response = await fetch(url, { signal })
          if (response.ok) {
            await cache.put(url, response)
          } else {
            failedTiles.push(tile)
          }
        }
      } catch {
        if (!signal?.aborted) failedTiles.push(tile)
      }
      downloaded++
      onProgress?.({ downloaded, total, failed: failedTiles.length })
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, tiles.length) }, () => worker()))

  return { downloaded, total, failed: failedTiles.length, failedTiles }
}
