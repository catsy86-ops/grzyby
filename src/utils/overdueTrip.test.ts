import { describe, expect, it } from 'vitest'
import { isTripOverdue } from './overdueTrip'

const NOW = 1_700_000_000_000

describe('isTripOverdue', () => {
  it('is not overdue when no planned return is set', () => {
    expect(isTripOverdue(null, NOW)).toBe(false)
    expect(isTripOverdue(undefined, NOW)).toBe(false)
  })

  it('is not overdue before the planned return time', () => {
    expect(isTripOverdue(NOW + 1000, NOW)).toBe(false)
  })

  it('is overdue at or after the planned return time', () => {
    expect(isTripOverdue(NOW, NOW)).toBe(true)
    expect(isTripOverdue(NOW - 1000, NOW)).toBe(true)
  })
})
