// Wgląd w zawartość Cache Storage używanego przez Service Workera (kafelki mapy offline,
// wagi modelu AI - patrz vite.config.ts runtimeCaching) i możliwość ręcznego wyczyszczenia,
// gdyby zabrakło miejsca na telefonie. Nie dotyczy danych użytkownika (Dexie/IndexedDB) -
// tylko odtwarzalnej zawartości pobranej z sieci.

export interface CacheInfo {
  name: string
  label: string
  entryCount: number
  // Suma rozmiarów odpowiedzi w cache - `null`, gdy nie udało się jej ustalić (np. odpowiedzi bez
  // nagłówka content-length i bez możliwości odczytu body). Trzymana osobno od `entryCount`,
  // żeby UI nie musiało zgadywać, czy liczba w tekście to "plików" czy "bajtów".
  sizeBytes: number | null
}

const MANAGED_CACHES: { name: string; label: string }[] = [
  { name: 'map-tiles', label: 'Kafelki mapy (offline)' },
  { name: 'ai-model', label: 'Model rozpoznawania AI' },
]

async function responseSize(response: Response): Promise<number | null> {
  const contentLength = response.headers.get('content-length')
  if (contentLength != null) {
    const parsed = Number(contentLength)
    if (Number.isFinite(parsed)) return parsed
  }
  try {
    const blob = await response.clone().blob()
    return blob.size
  } catch {
    return null
  }
}

export async function getCacheInfo(): Promise<CacheInfo[]> {
  if (typeof caches === 'undefined') return []
  const results: CacheInfo[] = []
  for (const { name, label } of MANAGED_CACHES) {
    try {
      const cache = await caches.open(name)
      const keys = await cache.keys()
      const sizes = await Promise.all(
        keys.map(async (key) => {
          const response = await cache.match(key)
          return response ? responseSize(response) : null
        }),
      )
      const sizeBytes = sizes.every((s) => s == null) ? null : sizes.reduce((sum: number, s) => sum + (s ?? 0), 0)
      results.push({ name, label, entryCount: keys.length, sizeBytes })
    } catch {
      results.push({ name, label, entryCount: 0, sizeBytes: null })
    }
  }
  return results
}

export interface StorageEstimate {
  usageBytes: number
  quotaBytes: number
}

export async function getStorageEstimate(): Promise<StorageEstimate | null> {
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) return null
  const estimate = await navigator.storage.estimate()
  return { usageBytes: estimate.usage ?? 0, quotaBytes: estimate.quota ?? 0 }
}

export async function clearCache(name: string): Promise<void> {
  if (typeof caches === 'undefined') return
  await caches.delete(name)
}

export function formatStorageBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
