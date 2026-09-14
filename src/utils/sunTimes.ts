// Oblicza czas zachodu/wschodu słońca dla danej pozycji i daty - lokalnie, bez żadnego API
// pogodowego/geolokalizacyjnego (algorytm US Naval Observatory / Almanac, powszechnie używany
// w kalkulatorach wschodu/zachodu słońca typu open-source). Dokładność ok. +/-2 minuty.

const DEG_TO_RAD = Math.PI / 180
const RAD_TO_DEG = 180 / Math.PI
// Oficjalny kąt zenitu uwzględniający refrakcję atmosferyczną i promień tarczy słońca.
const ZENITH_OFFICIAL = 90.8333

function dayOfYear(date: Date): number {
  const start = Date.UTC(date.getUTCFullYear(), 0, 1)
  const current = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  return Math.floor((current - start) / 86_400_000) + 1
}

function normalizeDegrees(deg: number): number {
  return ((deg % 360) + 360) % 360
}

type SunEvent = 'sunrise' | 'sunset'

// Zwraca czas zdarzenia w UTC (Date) lub null, gdy słońce w ogóle nie wschodzi/zachodzi tego dnia
// (okolice biegunów) - w Polsce praktycznie nie występuje, ale funkcja ma być bezpieczna wszędzie.
function calculateSunEvent(latitude: number, longitude: number, date: Date, event: SunEvent): Date | null {
  const n = dayOfYear(date)
  const lngHour = longitude / 15
  const t = event === 'sunrise' ? n + (6 - lngHour) / 24 : n + (18 - lngHour) / 24

  const meanAnomaly = 0.9856 * t - 3.289

  let trueLongitude =
    meanAnomaly +
    1.916 * Math.sin(meanAnomaly * DEG_TO_RAD) +
    0.02 * Math.sin(2 * meanAnomaly * DEG_TO_RAD) +
    282.634
  trueLongitude = normalizeDegrees(trueLongitude)

  let rightAscension = RAD_TO_DEG * Math.atan(0.91764 * Math.tan(trueLongitude * DEG_TO_RAD))
  rightAscension = normalizeDegrees(rightAscension)
  // RA musi być w tej samej ćwiartce co longitude prawdziwa słońca.
  const longitudeQuadrant = Math.floor(trueLongitude / 90) * 90
  const raQuadrant = Math.floor(rightAscension / 90) * 90
  rightAscension = rightAscension + (longitudeQuadrant - raQuadrant)
  rightAscension /= 15

  const sinDeclination = 0.39782 * Math.sin(trueLongitude * DEG_TO_RAD)
  const cosDeclination = Math.cos(Math.asin(sinDeclination))

  const cosHourAngle =
    (Math.cos(ZENITH_OFFICIAL * DEG_TO_RAD) - sinDeclination * Math.sin(latitude * DEG_TO_RAD)) /
    (cosDeclination * Math.cos(latitude * DEG_TO_RAD))

  if (cosHourAngle > 1 || cosHourAngle < -1) return null // słońce nie wschodzi/nie zachodzi tego dnia

  let hourAngle = event === 'sunrise' ? 360 - RAD_TO_DEG * Math.acos(cosHourAngle) : RAD_TO_DEG * Math.acos(cosHourAngle)
  hourAngle /= 15

  const localMeanTime = hourAngle + rightAscension - 0.06571 * t - 6.622
  const utcHours = normalizeDegrees(localMeanTime * 15) / 15 - lngHour

  const result = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  result.setUTCHours(0, 0, 0, 0)
  result.setUTCMilliseconds(normalizeDegrees(utcHours * 15) / 15 * 60 * 60 * 1000)
  return result
}

export function getSunset(latitude: number, longitude: number, date: Date = new Date()): Date | null {
  return calculateSunEvent(latitude, longitude, date, 'sunset')
}

export function getSunrise(latitude: number, longitude: number, date: Date = new Date()): Date | null {
  return calculateSunEvent(latitude, longitude, date, 'sunrise')
}

export function formatTimeUntil(target: Date, now: Date = new Date()): string {
  const diffMs = target.getTime() - now.getTime()
  if (diffMs <= 0) return '0 min'
  const totalMinutes = Math.round(diffMs / 60_000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) return `${minutes} min`
  return `${hours} godz. ${minutes} min`
}
