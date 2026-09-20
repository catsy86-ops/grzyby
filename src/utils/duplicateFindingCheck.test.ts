import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { getLastSpeciesId, isLikelyDuplicateFinding, rememberLastSpeciesId } from './duplicateFindingCheck'

describe('isLikelyDuplicateFinding', () => {
  const now = Date.now()

  it('nie ostrzega bez wybranego gatunku', () => {
    expect(
      isLikelyDuplicateFinding(
        { speciesId: null, spotId: 1 },
        [{ speciesId: null, spotId: 1, createdAt: now - 1000 }],
        now,
      ),
    ).toBe(false)
  })

  it('ostrzega, gdy ten sam gatunek i grzybowisko zostały dodane w ostatnich 2 minutach', () => {
    expect(
      isLikelyDuplicateFinding(
        { speciesId: 'borowik-szlachetny', spotId: 1 },
        [{ speciesId: 'borowik-szlachetny', spotId: 1, createdAt: now - 60_000 }],
        now,
      ),
    ).toBe(true)
  })

  it('nie ostrzega poza oknem czasowym (2 minuty)', () => {
    expect(
      isLikelyDuplicateFinding(
        { speciesId: 'borowik-szlachetny', spotId: 1 },
        [{ speciesId: 'borowik-szlachetny', spotId: 1, createdAt: now - 3 * 60_000 }],
        now,
      ),
    ).toBe(false)
  })

  it('nie ostrzega przy innym gatunku lub innym grzybowisku', () => {
    expect(
      isLikelyDuplicateFinding(
        { speciesId: 'borowik-szlachetny', spotId: 1 },
        [{ speciesId: 'maslak', spotId: 1, createdAt: now - 1000 }],
        now,
      ),
    ).toBe(false)
    expect(
      isLikelyDuplicateFinding(
        { speciesId: 'borowik-szlachetny', spotId: 1 },
        [{ speciesId: 'borowik-szlachetny', spotId: 2, createdAt: now - 1000 }],
        now,
      ),
    ).toBe(false)
  })
})

describe('getLastSpeciesId / rememberLastSpeciesId', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => localStorage.clear())

  it('zwraca null, gdy nic nie zapisano', () => {
    expect(getLastSpeciesId()).toBeNull()
  })

  it('zapamiętuje i odczytuje ostatnio wybrany gatunek', () => {
    rememberLastSpeciesId('borowik-szlachetny')
    expect(getLastSpeciesId()).toBe('borowik-szlachetny')
  })

  it('nie nadpisuje zapamiętanego gatunku wartością null ("-- nieokreślony --")', () => {
    rememberLastSpeciesId('borowik-szlachetny')
    rememberLastSpeciesId(null)
    expect(getLastSpeciesId()).toBe('borowik-szlachetny')
  })
})
