import type { Finding, Trip } from '../db/schema'

export const LONG_TRIP_THRESHOLD_MS = 4 * 60 * 60 * 1000

export function isLongTrip(startedAt: number, now: number = Date.now()): boolean {
  return now - startedAt >= LONG_TRIP_THRESHOLD_MS
}

// "Ile dni od ostatniego wyjścia" (ROZBUDOWA-ROADMAP.md Część 2 pkt 4) - czysto motywacyjny
// licznik, zero nowej treści merytorycznej, tylko agregacja już zbieranych `Trip`. Liczy od
// `startedAt` (nie `endedAt`) - to data faktycznego wyjścia w las, którą użytkownik pamięta i
// szuka ("kiedy ostatnio byłem"), niezależnie od tego, czy wyprawa jeszcze trwa. `null`, gdy nie
// ma jeszcze żadnej wyprawy w historii.
export function daysSinceLastTrip(trips: Trip[], now: number = Date.now()): number | null {
  if (trips.length === 0) return null
  const lastStartedAt = Math.max(...trips.map((t) => t.startedAt))
  return Math.max(0, Math.floor((now - lastStartedAt) / (24 * 60 * 60 * 1000)))
}

export function countSpeciesDiversity(findings: Finding[]): number {
  const speciesIds = new Set(findings.map((f) => f.speciesId).filter((id): id is string => id != null))
  return speciesIds.size
}

export interface SpeciesCount {
  speciesId: string | null
  count: number
}

// Rozbicie znalezisk wyprawy wg gatunku ("Borowik×7"), posortowane malejąco po liczności -
// `countSpeciesDiversity` zwraca tylko sumę różnorodności, ale nie mówi, który gatunek zdominował
// wyprawę. `speciesId: null` grupuje niezidentyfikowane znaleziska pod jedną pozycją. Sumuje
// `Finding.quantity` (liczba sztuk w danym wpisie), nie same wpisy - bez podanej liczby sztuk
// wpis liczy się jako 1 (stary format, jedno znalezisko = jedno zdarzenie).
export function groupFindingsBySpeciesCount(findings: Finding[]): SpeciesCount[] {
  const counts = new Map<string | null, number>()
  for (const finding of findings) {
    counts.set(finding.speciesId, (counts.get(finding.speciesId) ?? 0) + (finding.quantity ?? 1))
  }
  return Array.from(counts.entries())
    .map(([speciesId, count]) => ({ speciesId, count }))
    .sort((a, b) => b.count - a.count)
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

const MONTH_LABELS = [
  'Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru',
]

export interface MonthlyFindingsPoint {
  month: string
  count: number
}

// Rozkład znalezisk wg miesiąca kalendarzowego roku bieżącego - inaczej niż `groupFindingsByYear`
// (porównanie lat), to pokazuje sezonowość w obrębie jednego roku ("kiedy w roku najwięcej
// grzybów"), więc miesiące bez żadnego znaleziska też muszą się pojawić na wykresie jako 0
// (inaczej słupki "przeskakiwałyby" nierówno odstępami).
export function groupFindingsByMonth(findings: Finding[], year: number = new Date().getFullYear()): MonthlyFindingsPoint[] {
  const counts = new Array<number>(12).fill(0)
  for (const finding of findings) {
    const date = new Date(finding.createdAt)
    if (date.getFullYear() === year) counts[date.getMonth()]++
  }
  return MONTH_LABELS.map((label, i) => ({ month: label, count: counts[i] }))
}

// Zmiana procentowa względem poprzedniego roku - `null`, gdy brak danych z poprzedniego roku do
// porównania (dzielenie przez zero byłoby mylące, nie "0% zmiany").
export function yearOverYearDelta(current: number, previous: number): number | null {
  if (previous === 0) return null
  return Math.round(((current - previous) / previous) * 100)
}

export interface RainyTripInsight {
  avgFindingsRainy: number
  avgFindingsDry: number
  rainyTripCount: number
  dryTripCount: number
}

// Minimalna liczba wypraw w KAŻDEJ z grup (deszczowe/suche), żeby wynik nie opierał się na
// jednym przypadkowym dniu - z jedną wyprawą per grupa "70% więcej" mogłoby znaczyć "raz było
// więcej, raz mniej", nie realny wzorzec.
const MIN_TRIPS_PER_GROUP = 3

// "Warunki Twoich udanych wypraw" (ROZBUDOWA-ROADMAP.md Część 2 pkt 6) - porównuje średnią
// liczbę znalezisk na wyprawę między wyprawami zakończonymi w deszczu (`Trip.wasRainy`, Faza 20)
// a resztą. Celowo NIE twierdzi nic o "X dni po deszczu" (mielibyśmy do tego tylko jeden
// jednorazowy odczyt pogody z KOŃCA wyprawy, nie historię opadów z poprzednich dni) - to czysto
// własna, zweryfikowalna korelacja z danych użytkownika, zero nowych twierdzeń mykologicznych.
// `null`, gdy za mało danych w którejś grupie (patrz MIN_TRIPS_PER_GROUP) - w tym gdy `wasRainy`
// nigdy nie zostało zapisane (starsze wyprawy sprzed Fazy 20, albo zawsze failed best-effort
// odczyt pogody).
export function computeRainyTripInsight(trips: Trip[], findings: Finding[]): RainyTripInsight | null {
  const findingCountByTripId = new Map<number, number>()
  for (const f of findings) {
    if (f.tripId == null) continue
    findingCountByTripId.set(f.tripId, (findingCountByTripId.get(f.tripId) ?? 0) + 1)
  }

  const rainy: number[] = []
  const dry: number[] = []
  for (const trip of trips) {
    if (trip.wasRainy == null || trip.id == null) continue
    const count = findingCountByTripId.get(trip.id) ?? 0
    ;(trip.wasRainy ? rainy : dry).push(count)
  }

  if (rainy.length < MIN_TRIPS_PER_GROUP || dry.length < MIN_TRIPS_PER_GROUP) return null

  return {
    avgFindingsRainy: rainy.reduce((sum, v) => sum + v, 0) / rainy.length,
    avgFindingsDry: dry.reduce((sum, v) => sum + v, 0) / dry.length,
    rainyTripCount: rainy.length,
    dryTripCount: dry.length,
  }
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
