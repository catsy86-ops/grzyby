import { describe, expect, it } from 'vitest'
import { computeStormRisk } from './stormRisk'

describe('computeStormRisk', () => {
  it('flags thunderstorm WMO codes', () => {
    expect(computeStormRisk(95, 10)).toBe(true)
    expect(computeStormRisk(96, 10)).toBe(true)
    expect(computeStormRisk(99, 10)).toBe(true)
  })

  it('flags high wind even without a thunderstorm code', () => {
    expect(computeStormRisk(3, 55)).toBe(true)
  })

  it('does not flag calm, non-thunderstorm weather', () => {
    expect(computeStormRisk(1, 15)).toBe(false)
  })

  it('is not flagged right at the wind boundary below the threshold', () => {
    expect(computeStormRisk(0, 49)).toBe(false)
  })
})
