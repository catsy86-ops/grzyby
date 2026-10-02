import { describe, expect, it } from 'vitest'
import type { TreeCode } from '../data/forestCodes'
import type { Finding } from '../db/schema'
import { computeTreeInsights } from './treeInsight'

function finding(speciesId: string | null, treeCode: TreeCode | null): Finding {
  return {
    speciesId,
    speciesNameGuess: null,
    latitude: 53,
    longitude: 14,
    notes: '',
    createdAt: 0,
    forestStand: treeCode ? { treeCode, treeName: treeCode, age: 80, siteType: null } : undefined,
  }
}

describe('computeTreeInsights', () => {
  it('wskazuje drzewo, pod którym gatunek trafia się najczęściej', () => {
    const findings = [
      finding('borowik-szlachetny', 'BK'),
      finding('borowik-szlachetny', 'BK'),
      finding('borowik-szlachetny', 'DB'),
    ]
    expect(computeTreeInsights(findings)).toEqual([{ speciesId: 'borowik-szlachetny', treeCode: 'BK', count: 2, total: 3 }])
  })

  it('pomija gatunki z za małą liczbą znalezisk z drzewostanem i znaleziska bez drzewostanu', () => {
    const findings = [finding('kozlarz-babka', 'BRZ'), finding('kozlarz-babka', 'BRZ'), finding('kozlarz-babka', null)]
    expect(computeTreeInsights(findings)).toEqual([])
  })

  it('pomija gatunki bez wyraźnej przewagi jednego drzewa', () => {
    const findings = [finding('pieprznik-jadalny', 'SO'), finding('pieprznik-jadalny', 'SW'), finding('pieprznik-jadalny', 'BK')]
    expect(computeTreeInsights(findings)).toEqual([])
  })

  it('zwraca najpewniejsze wzorce (najwięcej znalezisk) i respektuje limit', () => {
    const findings = [
      ...Array.from({ length: 3 }, () => finding('maslak-zwyczajny', 'SO')),
      ...Array.from({ length: 5 }, () => finding('podgrzybek-brunatny', 'SO')),
      ...Array.from({ length: 4 }, () => finding('kozlarz-babka', 'BRZ')),
    ]
    expect(computeTreeInsights(findings).map((i) => i.speciesId)).toEqual(['podgrzybek-brunatny', 'kozlarz-babka'])
  })
})
