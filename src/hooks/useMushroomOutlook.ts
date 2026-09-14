import { useEffect, useState } from 'react'
import { fetchMushroomOutlook, type MushroomOutlook } from '../utils/mushroomWeather'
import { useOnlineStatus } from './useOnlineStatus'

const CACHE_KEY = 'grzyby-mushroom-outlook-cache'
const MAX_CACHE_AGE_MS = 6 * 60 * 60_000
const SIGNIFICANT_MOVE_DEGREES = 0.02 // ok. 2 km

interface CachedOutlook {
  lat: number
  lon: number
  timestamp: number
  outlook: MushroomOutlook
}

function readCache(): CachedOutlook | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as CachedOutlook
  } catch {
    return null
  }
}

function writeCache(entry: CachedOutlook) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry))
  } catch {
    // localStorage niedostępny/pełny - nie krytyczne, po prostu brak cache
  }
}

function isStale(cache: CachedOutlook, lat: number, lon: number, now: number): boolean {
  const tooOld = now - cache.timestamp > MAX_CACHE_AGE_MS
  const movedFar =
    Math.abs(cache.lat - lat) > SIGNIFICANT_MOVE_DEGREES || Math.abs(cache.lon - lon) > SIGNIFICANT_MOVE_DEGREES
  return tooOld || movedFar
}

// "Kiedy na grzyby" - wskaźnik wysypu na podstawie opadów/temperatury z ostatniego tygodnia
// (Open-Meteo, bez klucza API). Cache w localStorage: pierwszy odczyt natychmiastowy (działa
// offline z ostatnim znanym wynikiem), odświeżenie w tle tylko gdy online i cache
// przeterminowany lub pozycja istotnie się zmieniła. Błąd sieci nie jest pokazywany w UI -
// zostaje ostatnia znana wartość (lub null, gdy nigdy nie udało się pobrać).
export function useMushroomOutlook(position: [number, number] | null): MushroomOutlook | null {
  const isOnline = useOnlineStatus()
  const [outlook, setOutlook] = useState<MushroomOutlook | null>(() => readCache()?.outlook ?? null)

  // Zaokrąglone do klucza stringowego (~1.1 km), żeby ciągłe aktualizacje z watchPosition()
  // (drobne wahania GPS) nie odpalały fetcha przy każdym renderze.
  const roundedKey = position ? `${position[0].toFixed(2)},${position[1].toFixed(2)}` : null

  useEffect(() => {
    if (!position || !roundedKey || !isOnline) return
    const [lat, lon] = position

    const cache = readCache()
    if (cache && !isStale(cache, lat, lon, Date.now())) {
      setOutlook(cache.outlook)
      return
    }

    let cancelled = false
    fetchMushroomOutlook(lat, lon)
      .then((result) => {
        if (cancelled) return
        setOutlook(result)
        writeCache({ lat, lon, timestamp: Date.now(), outlook: result })
      })
      .catch(() => {
        // offline/API padło - zostajemy przy ostatniej znanej wartości, bez błędu w UI
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundedKey, isOnline])

  return outlook
}
