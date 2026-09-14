import { describe, expect, it } from 'vitest'
import type { Finding } from '../db/schema'
import {
  countSpeciesDiversity,
  formatDuration,
  formatWeight,
  isLongTrip,
  LONG_TRIP_THRESHOLD_MS,
  sumWeightGrams,
} from './tripStats'

function makeFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    speciesId: null,
    speciesNameGuess: null,
    latitude: null,
    longitude: null,
    notes: '',
    createdAt: Date.now(),
    ...overrides,
  }
}

describe('countSpeciesDiversity', () => {
  it('liczy unikalne speciesId, ignorując null', () => {
    const findings = [
      makeFinding({ speciesId: 'a' }),
      makeFinding({ speciesId: 'b' }),
      makeFinding({ speciesId: 'a' }),
      makeFinding({ speciesId: null }),
    ]
    expect(countSpeciesDiversity(findings)).toBe(2)
  })

  it('zwraca 0 dla pustej listy', () => {
    expect(countSpeciesDiversity([])).toBe(0)
  })
})

describe('sumWeightGrams', () => {
  it('sumuje tylko znaleziska z podaną wagą, traktując brak jako 0', () => {
    const findings = [
      makeFinding({ weightGrams: 150 }),
      makeFinding({ weightGrams: 300 }),
      makeFinding({}),
    ]
    expect(sumWeightGrams(findings)).toBe(450)
  })

  it('zwraca 0 dla pustej listy', () => {
    expect(sumWeightGrams([])).toBe(0)
  })
})

describe('formatWeight', () => {
  it('formatuje gramy poniżej 1000 jako "g"', () => {
    expect(formatWeight(450)).toBe('450 g')
  })

  it('formatuje 1000+ gramów jako "kg" z jednym miejscem po przecinku', () => {
    expect(formatWeight(2350)).toBe('2.4 kg')
  })
})

describe('formatDuration', () => {
  it('formatuje pełne godziny i minuty', () => {
    const started = Date.now() - (2 * 60 + 15) * 60_000
    expect(formatDuration(started, null)).toBe('2 godz. 15 min')
  })

  it('formatuje same minuty, gdy mniej niż godzina', () => {
    const started = Date.now() - 40 * 60_000
    expect(formatDuration(started, null)).toBe('40 min')
  })

  it('formatuje same godziny, gdy bez reszty minut', () => {
    const started = Date.now() - 3 * 60 * 60_000
    expect(formatDuration(started, null)).toBe('3 godz.')
  })

  it('zwraca "<1 min" dla bardzo krótkiego czasu', () => {
    expect(formatDuration(Date.now(), null)).toBe('<1 min')
  })

  it('liczy czas do endedAt zamiast do teraz, gdy podane', () => {
    const started = 0
    const ended = 90 * 60_000
    expect(formatDuration(started, ended)).toBe('1 godz. 30 min')
  })
})

describe('isLongTrip', () => {
  it('zwraca false, gdy wyprawa trwa krócej niż próg', () => {
    const now = 1_000_000
    expect(isLongTrip(now - (LONG_TRIP_THRESHOLD_MS - 1), now)).toBe(false)
  })

  it('zwraca true, gdy wyprawa trwa dokładnie tyle co próg lub dłużej', () => {
    const now = 1_000_000
    expect(isLongTrip(now - LONG_TRIP_THRESHOLD_MS, now)).toBe(true)
    expect(isLongTrip(now - LONG_TRIP_THRESHOLD_MS - 1, now)).toBe(true)
  })
})
