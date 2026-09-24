// Wspólny próg "czy wpis cache'u prognozy grzybowej jest przeterminowany" dla
// useMushroomOutlook.ts (jeden klucz, pozycja użytkownika) i useSpotMushroomOutlook.ts (mapa
// wpisów per spot) - obie różnią się tylko sposobem przechowywania, sama reguła staleness jest
// identyczna: zbyt stary ALBO współrzędne przesunęły się powyżej progu.
export function isOutlookCacheStale(
  cachedLat: number,
  cachedLon: number,
  cachedTimestamp: number,
  lat: number,
  lon: number,
  now: number,
  maxAgeMs: number,
  moveThresholdDegrees: number,
): boolean {
  const tooOld = now - cachedTimestamp > maxAgeMs
  const movedFar = Math.abs(cachedLat - lat) > moveThresholdDegrees || Math.abs(cachedLon - lon) > moveThresholdDegrees
  return tooOld || movedFar
}
