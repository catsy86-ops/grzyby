import { describe, expect, it } from 'vitest'
import { monthLabel, nextRevisitDate, shouldRemindRevisit } from './spotRevisit'

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

describe('nextRevisitDate', () => {
  it('przesuwa na kolejny rok, gdy oflagowany miesiąc w tym samym roku nie spełnia progu ~10 miesięcy', () => {
    const flaggedAt = new Date(2026, 8, 1).getTime() // wrzesień 2026
    const date = nextRevisitDate(9, flaggedAt) // wrzesień - ten sam miesiąc co flaga
    expect(date.getFullYear()).toBe(2027)
    expect(date.getMonth()).toBe(8)
    expect(date.getDate()).toBe(1)
  })

  it('zostaje w tym samym roku, gdy oflagowany miesiąc już spełnia próg ~10 miesięcy', () => {
    const flaggedAt = new Date(2025, 8, 1).getTime() // wrzesień 2025
    const date = nextRevisitDate(9, flaggedAt) // wrzesień 2026 - prawie rok później
    expect(date.getFullYear()).toBe(2026)
    expect(date.getMonth()).toBe(8)
  })
})
