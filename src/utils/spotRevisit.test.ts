import { describe, expect, it } from 'vitest'
import { monthLabel, shouldRemindRevisit } from './spotRevisit'

describe('monthLabel', () => {
  it('zwraca polską nazwę miesiąca dla wartości 1-12', () => {
    expect(monthLabel(1)).toBe('styczeń')
    expect(monthLabel(9)).toBe('wrzesień')
    expect(monthLabel(12)).toBe('grudzień')
  })
})

describe('shouldRemindRevisit', () => {
  it('zwraca false, gdy bieżący miesiąc nie zgadza się z oflagowanym', () => {
    const flaggedAt = new Date(2025, 8, 1).getTime() // wrzesień 2025
    const now = new Date(2026, 9, 1).getTime() // październik 2026
    expect(shouldRemindRevisit(9, flaggedAt, now)).toBe(false)
  })

  it('zwraca false, gdy miesiąc się zgadza, ale minęło za mało czasu od oflagowania (ten sam sezon)', () => {
    const flaggedAt = new Date(2026, 8, 1).getTime() // wrzesień 2026
    const now = new Date(2026, 8, 15).getTime() // wciąż wrzesień 2026
    expect(shouldRemindRevisit(9, flaggedAt, now)).toBe(false)
  })

  it('zwraca true, gdy miesiąc się zgadza i minął prawie rok od oflagowania', () => {
    const flaggedAt = new Date(2025, 8, 1).getTime() // wrzesień 2025
    const now = new Date(2026, 8, 15).getTime() // wrzesień 2026
    expect(shouldRemindRevisit(9, flaggedAt, now)).toBe(true)
  })
})
