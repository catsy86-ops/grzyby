import { describe, expect, it } from 'vitest'
import { computeRank } from './rank'

describe('computeRank', () => {
  it('zwraca "Nowicjusz" przy 0 znaleziskach, z celem do "Zbieracz"', () => {
    const rank = computeRank(0)
    expect(rank.tier.id).toBe('nowicjusz')
    expect(rank.nextTier?.id).toBe('zbieracz')
    expect(rank.findingsToNextTier).toBe(5)
  })

  it('awansuje dokładnie na progu, nie tuż przed nim', () => {
    expect(computeRank(4).tier.id).toBe('nowicjusz')
    expect(computeRank(5).tier.id).toBe('zbieracz')
  })

  it('zwraca kolejne rangi na progach 20/50/100', () => {
    expect(computeRank(20).tier.id).toBe('doswiadczony')
    expect(computeRank(50).tier.id).toBe('mistrz-lasu')
    expect(computeRank(100).tier.id).toBe('legenda')
  })

  it('brak nextTier i findingsToNextTier=null na najwyższej randze', () => {
    const rank = computeRank(500)
    expect(rank.tier.id).toBe('legenda')
    expect(rank.nextTier).toBeNull()
    expect(rank.findingsToNextTier).toBeNull()
  })
})
