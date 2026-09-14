import { useEffect, useState } from 'react'
import { formatTimeUntil, getSunset } from '../utils/sunTimes'

const UPDATE_INTERVAL_MS = 60_000

export interface SunsetCountdown {
  label: string
  isUrgent: boolean
}

// Licznik czasu do zmroku dla podanej pozycji - pomaga zaplanować bezpieczny powrót przed
// ciemnością. `isUrgent` (mniej niż godzina) do wizualnego podkreślenia w UI.
export function useSunsetCountdown(position: [number, number] | null): SunsetCountdown | null {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    if (!position) return
    const interval = setInterval(() => setNow(new Date()), UPDATE_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [position])

  if (!position) return null
  const [lat, lon] = position
  const sunset = getSunset(lat, lon, now)
  if (!sunset || sunset.getTime() <= now.getTime()) return null

  const remainingMs = sunset.getTime() - now.getTime()
  return {
    label: formatTimeUntil(sunset, now),
    isUrgent: remainingMs < 60 * 60_000,
  }
}
