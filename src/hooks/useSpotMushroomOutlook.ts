import { useEffect, useState } from 'react'
import { fetchMushroomOutlook, type MushroomOutlook } from '../utils/mushroomWeather'
import { useOnlineStatus } from './useOnlineStatus'

const CACHE_KEY = 'grzyby-spot-mushroom-outlook-cache'
const MAX_CACHE_AGE_MS = 6 * 60 * 60_000
// Spot się w praktyce nie przesuwa (w przeciwieństwie do pozycji użytkownika w
// useMushroomOutlook.ts) - próg tu tylko na wypadek edycji współrzędnych/reimportu danych.
const MOVED_THRESHOLD_DEGREES = 0.001

interface CachedEntry {
  lat: number
  lon: number
  timestamp: number
  outlook: MushroomOutlook
}

type CacheMap = Record<string, CachedEntry>

function readCache(): CacheMap {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? (JSON.parse(raw) as CacheMap) : {}
  } catch {
    return {}
  }
}

function writeEntry(spotId: number, entry: CachedEntry) {
  try {
    const cache = readCache()
    cache[spotId] = entry
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
  } catch {
    // localStorage niedostępny/pełny - nie krytyczne, po prostu brak cache
  }
}

function isStale(entry: CachedEntry, lat: number, lon: number, now: number): boolean {
  const tooOld = now - entry.timestamp > MAX_CACHE_AGE_MS
  const moved = Math.abs(entry.lat - lat) > MOVED_THRESHOLD_DEGREES || Math.abs(entry.lon - lon) > MOVED_THRESHOLD_DEGREES
  return tooOld || moved
}

export interface UseSpotMushroomOutlookResult {
  outlook: MushroomOutlook | null
  isLoading: boolean
}

// Prognoza grzybowa per zapisane grzybowisko, nie tylko bieżąca pozycja użytkownika (patrz
// useMushroomOutlook.ts) - "czy warto jechać na Grzybowisko X" sprawdzalne z kanapy. Pobierana
// dopiero gdy `enabled` (rozwinięta karta spotu w SpotManager), żeby nie pruć darmowego limitu
// Open-Meteo pobieraniem dla wszystkich zapisanych spotów naraz. Cache per-spot w localStorage.
export function useSpotMushroomOutlook(
  spotId: number,
  latitude: number,
  longitude: number,
  enabled: boolean,
): UseSpotMushroomOutlookResult {
  const isOnline = useOnlineStatus()
  const [outlook, setOutlook] = useState<MushroomOutlook | null>(() => {
    const cached = readCache()[spotId]
    return cached && !isStale(cached, latitude, longitude, Date.now()) ? cached.outlook : null
  })
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!enabled) return

    const cache = readCache()[spotId]
    if (cache && !isStale(cache, latitude, longitude, Date.now())) {
      setOutlook(cache.outlook)
      return
    }
    if (!isOnline) return

    let cancelled = false
    setIsLoading(true)
    fetchMushroomOutlook(latitude, longitude)
      .then((result) => {
        if (cancelled) return
        setOutlook(result)
        writeEntry(spotId, { lat: latitude, lon: longitude, timestamp: Date.now(), outlook: result })
      })
      .catch(() => {
        // offline/API padło - zostajemy przy ostatniej znanej wartości (lub null), bez błędu w UI
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, spotId, latitude, longitude, isOnline])

  return { outlook, isLoading }
}
