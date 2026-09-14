import { describe, expect, it } from 'vitest'
import type { Finding } from '../db/schema'
import { computeSpotStats } from './spotStats'

function finding(overrides: Partial<Finding> = {}): Finding {
  return {
    speciesId: null,
    speciesNameGuess: null,
    latitude: null,
    longitude: null,
    notes: '',
    createdAt: 1000,
    ...overrides,
  }
}

describe('computeSpotStats', () => {
  it('zwraca zerowe statystyki dla braku znalezisk', () => {
    expect(computeSpotStats([])).toEqual({ findingCount: 0, speciesDiversity: 0, lastVisitAt: null })
  })

  it('liczy liczbę znalezisk, różnorodność gatunków i datę ostatniej wizyty', () => {
    const findings = [
      finding({ speciesId: 'borowik-szlachetny', createdAt: 1000 }),
      finding({ speciesId: 'borowik-szlachetny', createdAt: 3000 }),
      finding({ speciesId: 'maslak-zwyczajny', createdAt: 2000 }),
      finding({ speciesId: null, createdAt: 500 }),
    ]

    expect(computeSpotStats(findings)).toEqual({ findingCount: 4, speciesDiversity: 2, lastVisitAt: 3000 })
  })
})
