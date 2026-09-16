import type { Finding } from '../db/schema'

export const LONG_TRIP_THRESHOLD_MS = 4 * 60 * 60 * 1000

export function isLongTrip(startedAt: number, now: number = Date.now()): boolean {
  return now - startedAt >= LONG_TRIP_THRESHOLD_MS
}

export function countSpeciesDiversity(findings: Finding[]): number {
  const speciesIds = new Set(findings.map((f) => f.speciesId).filter((id): id is string => id != null))
  return speciesIds.size
}

export function sumWeightGrams(findings: Finding[]): number {
  return findings.reduce((sum, f) => sum + (f.weightGrams ?? 0), 0)
}

export function formatWeight(grams: number): string {
  if (grams < 1000) return `${grams} g`
  return `${(grams / 1000).toFixed(1)} kg`
}

// Grupowanie znalezisk wg roku kalendarzowego - uproszczenie "sezonu" (realny sezon grzybowy nie
// pokrywa się dokładnie z rokiem kalendarzowym, ale to wystarczające przybliżenie dla
// porównania "ten rok vs poprzedni" bez wprowadzania osobnego pojęcia sezonu w danych).
export function groupFindingsByYear(findings: Finding[]): Map<number, Finding[]> {
  const byYear = new Map<number, Finding[]>()
  for (const finding of findings) {
    const year = new Date(finding.createdAt).getFullYear()
    const existing = byYear.get(year)
    if (existing) existing.push(finding)
    else byYear.set(year, [finding])
  }
  return byYear
}

// Zmiana procentowa względem poprzedniego roku - `null`, gdy brak danych z poprzedniego roku do
// porównania (dzielenie przez zero byłoby mylące, nie "0% zmiany").
export function yearOverYearDelta(current: number, previous: number): number | null {
  if (previous === 0) return null
  return Math.round(((current - previous) / previous) * 100)
}

export function formatDuration(startedAt: number, endedAt: number | null): string {
  const ms = Math.max(0, (endedAt ?? Date.now()) - startedAt)
  const totalMinutes = Math.floor(ms / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours === 0 && minutes === 0) return '<1 min'
  if (hours === 0) return `${minutes} min`
  if (minutes === 0) return `${hours} godz.`
  return `${hours} godz. ${minutes} min`
}
