import { describe, expect, it } from 'vitest'
import { rankSpotsBySeasonality } from './spotRanking'
import type { Finding, Spot } from '../db/schema'

const NOW = new Date(2026, 8, 15) // wrzesień 2026

function makeSpot(id: number, name: string): Spot {
  return { id, name, latitude: 0, longitude: 0, notes: '', createdAt: 0 }
}

function findingInSeptember(spotId: number, year: number): Finding {
  return {
    speciesId: null,
    speciesNameGuess: null,
    latitude: null,
    longitude: null,
    notes: '',
    createdAt: new Date(year, 8, 10).getTime(),
    spotId,
  }
}

describe('rankSpotsBySeasonality', () => {
  it('excludes spots below the minimum match threshold', () => {
    const spots = [makeSpot(1, 'Za rzeką')]
    const findings = [findingInSeptember(1, 2025)] // only 1 past match
    expect(rankSpotsBySeasonality(spots, findings, NOW)).toEqual([])
  })

  it('ranks spots with enough matches, highest first', () => {
    const spots = [makeSpot(1, 'Mało'), makeSpot(2, 'Dużo')]
    const findings = [
      findingInSeptember(1, 2024),
      findingInSeptember(1, 2025),
      findingInSeptember(2, 2023),
      findingInSeptember(2, 2024),
      findingInSeptember(2, 2025),
    ]
    const result = rankSpotsBySeasonality(spots, findings, NOW)
    expect(result.map((r) => r.spot.name)).toEqual(['Dużo', 'Mało'])
    expect(result[0].matchCount).toBe(3)
    expect(result[1].matchCount).toBe(2)
  })
})
