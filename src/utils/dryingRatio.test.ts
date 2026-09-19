import { describe, expect, it } from 'vitest'
import { computeDryingRatioPercent } from './dryingRatio'

describe('computeDryingRatioPercent', () => {
  it('computes the percentage of weight remaining after drying', () => {
    expect(computeDryingRatioPercent(1000, 100)).toBe(10)
  })

  it('rounds to the nearest whole percent', () => {
    expect(computeDryingRatioPercent(300, 100)).toBe(33)
  })

  it('returns null when the fresh weight is zero or negative', () => {
    expect(computeDryingRatioPercent(0, 50)).toBeNull()
    expect(computeDryingRatioPercent(-10, 50)).toBeNull()
  })
})
