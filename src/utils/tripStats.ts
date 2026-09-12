import type { Finding } from '../db/schema'

export const LONG_TRIP_THRESHOLD_MS = 4 * 60 * 60 * 1000

export function isLongTrip(startedAt: number, now: number = Date.now()): boolean {
  return now - startedAt >= LONG_TRIP_THRESHOLD_MS
}

export function countSpeciesDiversity(findings: Finding[]): number {
  const speciesIds = new Set(findings.map((f) => f.speciesId).filter((id): id is string => id != null))
  return speciesIds.size
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
