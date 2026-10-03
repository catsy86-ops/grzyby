import { describe, expect, it } from 'vitest'
import type { Species } from '../db/schema'
import { getScannerCoverage, getUncoveredLookalikes } from './scannerCoverage'

function species(id: string, lookalikes: string[] = []): Species {
  return { id, nameCommon: id, lookalikes } as unknown as Species
}

const ALL = [species('a', ['b', 'c', 'zz']), species('b'), species('c')]

describe('scannerCoverage', () => {
  it('dzieli atlas na gatunki znane i nieznane modelowi (klasa "inne" ignorowana)', () => {
    const { covered, uncovered } = getScannerCoverage(['a', 'b', 'inne'], ALL)
    expect(covered.map((s) => s.id)).toEqual(['a', 'b'])
    expect(uncovered.map((s) => s.id)).toEqual(['c'])
  })

  it('zwraca tylko sobowtóry spoza modelu, pomijając nieistniejące id', () => {
    expect(getUncoveredLookalikes(ALL[0], ['a', 'b'], ALL).map((s) => s.id)).toEqual(['c'])
  })

  it('nic nie zwraca, gdy model zna cały atlas', () => {
    expect(getScannerCoverage(['a', 'b', 'c'], ALL).uncovered).toEqual([])
    expect(getUncoveredLookalikes(ALL[0], ['a', 'b', 'c'], ALL)).toEqual([])
  })
})
