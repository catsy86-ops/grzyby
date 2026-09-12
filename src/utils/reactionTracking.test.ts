import { describe, expect, it } from 'vitest'
import type { Finding } from '../db/schema'
import {
  DELAYED_ONSET_WINDOW_HOURS,
  findOverlappingConsumedFindings,
  isWithinDelayedOnsetWindow,
  severityLabel,
} from './reactionTracking'

function makeFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    id: 1,
    speciesId: null,
    speciesNameGuess: 'Borowik',
    latitude: null,
    longitude: null,
    notes: '',
    createdAt: Date.now(),
    ...overrides,
  }
}

const HOUR = 60 * 60 * 1000

describe('isWithinDelayedOnsetWindow', () => {
  it('zwraca false, gdy znalezisko nie zostało spożyte', () => {
    const finding = makeFinding({ consumed: false })
    expect(isWithinDelayedOnsetWindow(finding)).toBe(false)
  })

  it('zwraca false, gdy consumedAt jest brakiem danych mimo consumed=true', () => {
    const finding = makeFinding({ consumed: true, consumedAt: null })
    expect(isWithinDelayedOnsetWindow(finding)).toBe(false)
  })

  it('zwraca true tuż po spożyciu', () => {
    const now = Date.now()
    const finding = makeFinding({ consumed: true, consumedAt: now - HOUR })
    expect(isWithinDelayedOnsetWindow(finding, now)).toBe(true)
  })

  it('zwraca true na granicy okna (24h)', () => {
    const now = Date.now()
    const finding = makeFinding({ consumed: true, consumedAt: now - DELAYED_ONSET_WINDOW_HOURS * HOUR })
    expect(isWithinDelayedOnsetWindow(finding, now)).toBe(true)
  })

  it('zwraca false po upływie okna', () => {
    const now = Date.now()
    const finding = makeFinding({ consumed: true, consumedAt: now - (DELAYED_ONSET_WINDOW_HOURS + 1) * HOUR })
    expect(isWithinDelayedOnsetWindow(finding, now)).toBe(false)
  })
})

describe('findOverlappingConsumedFindings', () => {
  it('zwraca pustą listę, gdy znalezisko docelowe nie zostało spożyte', () => {
    const target = makeFinding({ id: 1, consumed: false })
    const others = [makeFinding({ id: 2, consumed: true, consumedAt: Date.now() })]
    expect(findOverlappingConsumedFindings(target, others)).toEqual([])
  })

  it('znajduje inne spożyte znaleziska w tym samym oknie czasowym', () => {
    const now = Date.now()
    const target = makeFinding({ id: 1, consumed: true, consumedAt: now })
    const overlapping = makeFinding({ id: 2, consumed: true, consumedAt: now + HOUR })
    const tooFarApart = makeFinding({ id: 3, consumed: true, consumedAt: now + 48 * HOUR })
    const notConsumed = makeFinding({ id: 4, consumed: false })
    const all = [target, overlapping, tooFarApart, notConsumed]

    const result = findOverlappingConsumedFindings(target, all)
    expect(result.map((f) => f.id)).toEqual([2])
  })

  it('wyklucza samo znalezisko docelowe z wyników', () => {
    const now = Date.now()
    const target = makeFinding({ id: 1, consumed: true, consumedAt: now })
    const result = findOverlappingConsumedFindings(target, [target])
    expect(result).toEqual([])
  })
})

describe('severityLabel', () => {
  it('tłumaczy znane wartości', () => {
    expect(severityLabel('brak')).toBe('Brak objawów')
    expect(severityLabel('lekka')).toBe('Lekka reakcja')
    expect(severityLabel('ciężka')).toBe('Ciężka reakcja')
  })

  it('zwraca wartość domyślną dla braku danych', () => {
    expect(severityLabel(null)).toBe('Nieokreślone')
    expect(severityLabel(undefined)).toBe('Nieokreślone')
  })
})
