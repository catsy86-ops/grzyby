import { describe, expect, it } from 'vitest'
import type { Finding } from '../db/schema'
import { countSpeciesDiversity, formatDuration } from './tripStats'

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
