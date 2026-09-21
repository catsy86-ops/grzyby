import { describe, it, expect, beforeEach } from 'vitest'
import { pruneTripNotificationKeys } from './pruneTripNotifications'

describe('pruneTripNotificationKeys', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('usuwa klucze per-wyprawa dla wypraw, których już nie ma w bazie', () => {
    localStorage.setItem('lysy-storm-warning-notified-1', '1')
    localStorage.setItem('lysy-storm-warning-notified-2', '1')
    localStorage.setItem('lysy-overdue-trip-notified-2', '1')
    localStorage.setItem('lysy-tick-spray-last-notified-3', '12345')
    // Klucz niezwiązany z tym mechanizmem - nie powinien zostać tknięty.
    localStorage.setItem('unrelated-key', 'zostaw mnie')

    pruneTripNotificationKeys(new Set([2]))

    expect(localStorage.getItem('lysy-storm-warning-notified-1')).toBeNull()
    expect(localStorage.getItem('lysy-storm-warning-notified-2')).toBe('1')
    expect(localStorage.getItem('lysy-overdue-trip-notified-2')).toBe('1')
    expect(localStorage.getItem('lysy-tick-spray-last-notified-3')).toBeNull()
    expect(localStorage.getItem('unrelated-key')).toBe('zostaw mnie')
  })

  it('filtruje JSON-array kleszczowych powiadomień do wciąż istniejących wypraw', () => {
    localStorage.setItem('lysy-tick-check-notified-trip-ids', JSON.stringify([1, 2, 3]))

    pruneTripNotificationKeys(new Set([2]))

    expect(JSON.parse(localStorage.getItem('lysy-tick-check-notified-trip-ids')!)).toEqual([2])
  })

  it('nie wywala się na uszkodzonym JSON w kluczu tick-check', () => {
    localStorage.setItem('lysy-tick-check-notified-trip-ids', '{niepoprawny json')

    expect(() => pruneTripNotificationKeys(new Set([1]))).not.toThrow()
  })
})
