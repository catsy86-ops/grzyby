import { describe, expect, it } from 'vitest'
import type { Finding } from '../db/schema'
import { countPastSeasonalMatches, hasSeasonalMatch, MIN_MATCHES_FOR_SEASONAL_RING } from './spotSeasonality'

function finding(overrides: Partial<Finding>): Finding {
  return {
    id: 1,
    speciesId: null,
    speciesNameGuess: null,
    latitude: null,
    longitude: null,
    notes: '',
    createdAt: Date.now(),
    ...overrides,
  }
}

describe('spotSeasonality', () => {
  const now = new Date('2026-09-19T12:00:00')

  it('counts only past-year findings from the same calendar month at the given spot', () => {
    const findings = [
      finding({ spotId: 1, createdAt: new Date('2025-09-05').getTime() }),
      finding({ spotId: 1, createdAt: new Date('2024-09-12').getTime() }),
      finding({ spotId: 1, createdAt: new Date('2025-10-01').getTime() }), // wrong month
      finding({ spotId: 2, createdAt: new Date('2025-09-05').getTime() }), // wrong spot
      finding({ spotId: 1, createdAt: new Date('2026-09-01').getTime() }), // current year, excluded
    ]
    expect(countPastSeasonalMatches(1, findings, now)).toBe(2)
  })

  it('requires the minimum match threshold before flagging a seasonal match', () => {
    const oneMatch = [finding({ spotId: 1, createdAt: new Date('2025-09-05').getTime() })]
    expect(oneMatch.length).toBeLessThan(MIN_MATCHES_FOR_SEASONAL_RING)
    expect(hasSeasonalMatch(1, oneMatch, now)).toBe(false)

    const twoMatches = [
      finding({ spotId: 1, createdAt: new Date('2025-09-05').getTime() }),
      finding({ spotId: 1, createdAt: new Date('2024-09-12').getTime() }),
    ]
    expect(hasSeasonalMatch(1, twoMatches, now)).toBe(true)
  })
})
