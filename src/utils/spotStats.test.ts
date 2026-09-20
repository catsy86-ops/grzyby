import { describe, expect, it } from 'vitest'
import type { Finding, Spot } from '../db/schema'
import { computeSpotStats, rankSpotsByFindingCount } from './spotStats'

function spot(overrides: Partial<Spot> = {}): Spot {
  return { name: 'Spot', latitude: 0, longitude: 0, notes: '', createdAt: 1, ...overrides }
}

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

describe('rankSpotsByFindingCount', () => {
  it('zwraca pustą listę bez znalezisk', () => {
    expect(rankSpotsByFindingCount([], [])).toEqual([])
  })

  it('liczy znaleziska per spot i sortuje malejąco', () => {
    const spotA = spot({ name: 'Sosnowy zagajnik' })
    const spotB = spot({ name: 'Za rzeką' })
    spotA.id = 1
    spotB.id = 2
    const findings = [
      finding({ spotId: 1 }),
      finding({ spotId: 1 }),
      finding({ spotId: 2 }),
    ]

    expect(rankSpotsByFindingCount(findings, [spotA, spotB])).toEqual([
      { name: 'Sosnowy zagajnik', count: 2 },
      { name: 'Za rzeką', count: 1 },
    ])
  })

  it('pomija znaleziska bez spotId lub wskazujące na nieistniejący spot', () => {
    const spotA = spot({ name: 'Sosnowy zagajnik', id: 1 })
    const findings = [finding({ spotId: undefined }), finding({ spotId: 99 }), finding({ spotId: 1 })]

    expect(rankSpotsByFindingCount(findings, [spotA])).toEqual([{ name: 'Sosnowy zagajnik', count: 1 }])
  })

  it('obcina wynik do `limit`', () => {
    const spots = [1, 2, 3].map((id) => spot({ id, name: `Spot ${id}` }))
    const findings = spots.map((s) => finding({ spotId: s.id }))

    expect(rankSpotsByFindingCount(findings, spots, 2)).toHaveLength(2)
  })
})
