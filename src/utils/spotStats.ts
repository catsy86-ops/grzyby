import type { Finding, Spot } from '../db/schema'
import { countSpeciesDiversity } from './tripStats'

export interface SpotStats {
  findingCount: number
  speciesDiversity: number
  lastVisitAt: number | null
}

// Statystyki znalezisk powiązanych z jednym grzybowiskiem (`Finding.spotId`) - odzwierciedla
// "historię zbiorów w czasie" w tym miejscu, niezależnie od tego, w ramach jakich wypraw (Trip)
// zostały zebrane.
export function computeSpotStats(findings: Finding[]): SpotStats {
  return {
    findingCount: findings.length,
    speciesDiversity: countSpeciesDiversity(findings),
    lastVisitAt: findings.length > 0 ? Math.max(...findings.map((f) => f.createdAt)) : null,
  }
}

export interface SpotFindingCount {
  name: string
  count: number
}

// "Najlepsze miejscówki" wg liczby znalezisk (Dziennik - wykres statystyk) - inny wymiar niż
// `computeSpotStats` (statystyki JEDNEGO spotu) i inny niż `spotRanking.ts` (ranking wg
// sezonowości, nie ilości). Znaleziska bez `spotId` lub wskazujące na usunięty/nieznany spot są
// pomijane - nie ma czym ich podpisać na wykresie.
export function rankSpotsByFindingCount(findings: Finding[], spots: Spot[], limit = 5): SpotFindingCount[] {
  const nameById = new Map(spots.map((s) => [s.id, s.name]))
  const counts = new Map<string, number>()
  for (const finding of findings) {
    if (finding.spotId == null) continue
    const name = nameById.get(finding.spotId)
    if (name == null) continue
    counts.set(name, (counts.get(name) ?? 0) + 1)
  }
  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}
