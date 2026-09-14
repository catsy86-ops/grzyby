import type { Finding } from '../db/schema'
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
