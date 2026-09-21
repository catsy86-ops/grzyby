// Dystans i kierunek do zapisanego punktu (np. auta/startu trasy) - liczone wyłącznie z GPS,
// bez czujnika kierunku urządzenia (DeviceOrientationEvent). Prawdziwy, obracający się kompas
// wymagałby żyroskopu/magnetometru, którego wsparcie i uprawnienia (zwłaszcza iOS Safari) są
// niespójne między przeglądarkami - strzałka pokazuje kierunek względem północy (góra ekranu),
// użytkownik orientuje się względem niej samodzielnie (realny kompas/słońce) lub GPS-em w ruchu.

const EARTH_RADIUS_METERS = 6_371_000
const DEG_TO_RAD = Math.PI / 180
const RAD_TO_DEG = 180 / Math.PI

export type Position = [number, number]

export function getDistanceMeters([lat1, lon1]: Position, [lat2, lon2]: Position): number {
  const dLat = (lat2 - lat1) * DEG_TO_RAD
  const dLon = (lon2 - lon1) * DEG_TO_RAD
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * DEG_TO_RAD) * Math.cos(lat2 * DEG_TO_RAD) * Math.sin(dLon / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return EARTH_RADIUS_METERS * c
}

// Początkowy azymut (0-360, 0 = północ, rosnąco zgodnie z ruchem wskazówek zegara) na łuku
// wielkiego koła od punktu `from` do `to`.
export function getBearingDegrees([lat1, lon1]: Position, [lat2, lon2]: Position): number {
  const lat1Rad = lat1 * DEG_TO_RAD
  const lat2Rad = lat2 * DEG_TO_RAD
  const dLon = (lon2 - lon1) * DEG_TO_RAD

  const y = Math.sin(dLon) * Math.cos(lat2Rad)
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon)
  const bearing = Math.atan2(y, x) * RAD_TO_DEG
  return (bearing + 360) % 360
}

const CARDINAL_DIRECTIONS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const

export function getCardinalDirection(bearingDegrees: number): string {
  const index = Math.round(bearingDegrees / 45) % 8
  return CARDINAL_DIRECTIONS[index]
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`
  return `${(meters / 1000).toFixed(1)} km`
}

export interface BearingInfo {
  distanceMeters: number
  bearingDegrees: number
}

// Wspólne dla wszystkich hooków liczących dystans/kierunek do zapisanego punktu (auto, spot
// nawigacji) - dotąd ten sam `{distanceMeters: getDistanceMeters(...), bearingDegrees:
// getBearingDegrees(...)}` był powtórzony osobno w useReturnPointTracking.ts i
// useSpotNavigation.ts.
export function getBearingInfo(from: Position, to: Position): BearingInfo {
  return {
    distanceMeters: getDistanceMeters(from, to),
    bearingDegrees: getBearingDegrees(from, to),
  }
}

// "620 m NE"/"1.2 km SW" - format powtórzony dosłownie w MapStatusBadges.tsx (dwa razy) i
// FindingsListView.tsx przed tym wydzieleniem.
export function describeBearing({ distanceMeters, bearingDegrees }: BearingInfo): string {
  return `${formatDistance(distanceMeters)} ${getCardinalDirection(bearingDegrees)}`
}
