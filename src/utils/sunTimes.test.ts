import { describe, expect, it } from 'vitest'
import { formatTimeUntil, getSunrise, getSunset } from './sunTimes'

const WARSAW: [number, number] = [52.2297, 21.0122]

function minutesBetween(a: Date, b: Date): number {
  return Math.abs(a.getTime() - b.getTime()) / 60_000
}

describe('getSunset / getSunrise (Warszawa)', () => {
  it('zachód słońca w przesilenie letnie jest ok. 19:03 UTC (+/- 15 min)', () => {
    const date = new Date(Date.UTC(2026, 5, 21))
    const sunset = getSunset(...WARSAW, date)
    expect(sunset).not.toBeNull()
    const expected = new Date(Date.UTC(2026, 5, 21, 19, 3))
    expect(minutesBetween(sunset!, expected)).toBeLessThan(15)
  })

  it('zachód słońca w przesilenie zimowe jest ok. 14:24 UTC (+/- 15 min)', () => {
    const date = new Date(Date.UTC(2026, 11, 21))
    const sunset = getSunset(...WARSAW, date)
    expect(sunset).not.toBeNull()
    const expected = new Date(Date.UTC(2026, 11, 21, 14, 24))
    expect(minutesBetween(sunset!, expected)).toBeLessThan(15)
  })

  it('wschód słońca jest przed zachodem tego samego dnia', () => {
    const date = new Date(Date.UTC(2026, 5, 21))
    const sunrise = getSunrise(...WARSAW, date)
    const sunset = getSunset(...WARSAW, date)
    expect(sunrise).not.toBeNull()
    expect(sunset).not.toBeNull()
    expect(sunrise!.getTime()).toBeLessThan(sunset!.getTime())
  })
})

describe('formatTimeUntil', () => {
  it('formatuje pełne godziny i minuty', () => {
    const now = new Date(2026, 5, 21, 10, 0)
    const target = new Date(2026, 5, 21, 13, 30)
    expect(formatTimeUntil(target, now)).toBe('3 godz. 30 min')
  })

  it('formatuje same minuty, gdy mniej niż godzina', () => {
    const now = new Date(2026, 5, 21, 10, 0)
    const target = new Date(2026, 5, 21, 10, 45)
    expect(formatTimeUntil(target, now)).toBe('45 min')
  })

  it('zwraca "0 min", gdy cel już minął', () => {
    const now = new Date(2026, 5, 21, 10, 0)
    const target = new Date(2026, 5, 21, 9, 0)
    expect(formatTimeUntil(target, now)).toBe('0 min')
  })
})
