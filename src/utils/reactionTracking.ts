import type { Finding, ReactionSeverity } from '../db/schema'

const MS_IN_HOUR = 60 * 60 * 1000

/**
 * Muchomor sromotnikowy i inne amanitowe toksyny dają objawy dopiero po
 * kilku-kilkunastu godzinach - dlatego okno "niedawno spożytych" znalezisk
 * jest znacznie szersze niż typowe zatrucie pokarmowe.
 */
export const DELAYED_ONSET_WINDOW_HOURS = 24

/** Czy znalezisko zostało spożyte i wciąż jest w oknie możliwych opóźnionych objawów. */
export function isWithinDelayedOnsetWindow(finding: Finding, now: number = Date.now()): boolean {
  if (!finding.consumed || finding.consumedAt == null) return false
  const elapsedHours = (now - finding.consumedAt) / MS_IN_HOUR
  return elapsedHours >= 0 && elapsedHours <= DELAYED_ONSET_WINDOW_HOURS
}

/** Znaleziska spożyte w tym samym oknie czasowym co dane znalezisko - potencjalni "współpodejrzani" przy zatruciu. */
export function findOverlappingConsumedFindings(
  target: Finding,
  allFindings: Finding[],
  windowHours: number = DELAYED_ONSET_WINDOW_HOURS,
): Finding[] {
  if (!target.consumed || target.consumedAt == null) return []
  const windowMs = windowHours * MS_IN_HOUR
  return allFindings.filter((f) => {
    if (f.id === target.id) return false
    if (!f.consumed || f.consumedAt == null) return false
    return Math.abs(f.consumedAt - target.consumedAt!) <= windowMs
  })
}

export function severityLabel(severity: ReactionSeverity | null | undefined): string {
  switch (severity) {
    case 'brak':
      return 'Brak objawów'
    case 'lekka':
      return 'Lekka reakcja'
    case 'ciężka':
      return 'Ciężka reakcja'
    default:
      return 'Nieokreślone'
  }
}
