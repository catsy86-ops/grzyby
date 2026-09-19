import type { Finding, Spot } from '../db/schema'
import { countPastSeasonalMatches, MIN_MATCHES_FOR_SEASONAL_RING } from './spotSeasonality'

export interface RankedSpot {
  spot: Spot
  matchCount: number
}

// "Dziś warto iść do:" - ranking zapisanych grzybowisk wg własnej historii sezonowej
// (spotSeasonality.ts), bez odpytywania pogody dla wszystkich spotów naraz (patrz
// useSpotMushroomOutlook.ts - prognoza per-spot jest celowo leniwa, żeby nie pruć darmowego
// limitu Open-Meteo). Sezonowość jest za to czysto lokalna (dane już w bazie), więc ranking
// wszystkich spotów jest tu darmowy - prognozę pogody dla konkretnego typu użytkownik i tak
// sprawdza jednym dodatkowym dotknięciem w SpotRow.
export function rankSpotsBySeasonality(spots: Spot[], findings: Finding[], date: Date = new Date()): RankedSpot[] {
  return spots
    .map((spot) => ({ spot, matchCount: spot.id != null ? countPastSeasonalMatches(spot.id, findings, date) : 0 }))
    .filter((entry) => entry.matchCount >= MIN_MATCHES_FOR_SEASONAL_RING)
    .sort((a, b) => b.matchCount - a.matchCount)
}
