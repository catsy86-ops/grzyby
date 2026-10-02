import { describe, expect, it } from 'vitest'
import { getDayPhase } from './TimeOfDayGlow'

describe('getDayPhase', () => {
  it('dzieli dobę na świt, dzień, zmierzch i noc', () => {
    expect(getDayPhase(4)).toBe('noc')
    expect(getDayPhase(5)).toBe('swit')
    expect(getDayPhase(8)).toBe('dzien')
    expect(getDayPhase(17)).toBe('dzien')
    expect(getDayPhase(18)).toBe('zmierzch')
    expect(getDayPhase(21)).toBe('noc')
    expect(getDayPhase(0)).toBe('noc')
  })
})
