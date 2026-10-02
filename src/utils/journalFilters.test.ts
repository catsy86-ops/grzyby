import { describe, expect, it } from 'vitest'
import type { Finding, FindingForestStand } from '../db/schema'
import { isWithinDateRange, listFindingTrees } from './journalFilters'

describe('isWithinDateRange', () => {
  it('przepuszcza wszystko, gdy obie granice są puste', () => {
    expect(isWithinDateRange(Date.now(), '', '')).toBe(true)
  })

  it('odrzuca daty przed dolną granicą', () => {
    const createdAt = new Date('2026-09-01T12:00:00').getTime()
    expect(isWithinDateRange(createdAt, '2026-09-02', '')).toBe(false)
  })

  it('odrzuca daty po górnej granicy', () => {
    const createdAt = new Date('2026-09-10T12:00:00').getTime()
    expect(isWithinDateRange(createdAt, '', '2026-09-09')).toBe(false)
  })

  it('przepuszcza wpis dodany w dniu wybranym jako górna granica (inkluzywnie do końca dnia)', () => {
    const createdAt = new Date('2026-09-09T23:30:00').getTime()
    expect(isWithinDateRange(createdAt, '', '2026-09-09')).toBe(true)
  })

  it('przepuszcza wpis dokładnie w środku zakresu', () => {
    const createdAt = new Date('2026-09-05T08:00:00').getTime()
    expect(isWithinDateRange(createdAt, '2026-09-01', '2026-09-10')).toBe(true)
  })
})

describe('listFindingTrees', () => {
  const finding = (forestStand?: FindingForestStand | null) => ({ forestStand }) as Finding

  it('zwraca drzewa od najczęstszego, bez powtórzeń', () => {
    const stand = (treeCode: 'BK' | 'SO'): FindingForestStand => ({ treeCode, treeName: '', age: null, siteType: null })
    expect(listFindingTrees([finding(stand('SO')), finding(stand('BK')), finding(stand('BK'))])).toEqual(['BK', 'SO'])
  })

  it('pomija znaleziska bez drzewostanu, poza lasem i z nieznanym kodem drzewa', () => {
    expect(
      listFindingTrees([
        finding(undefined),
        finding(null),
        finding({ treeCode: null, treeName: 'CIS', age: null, siteType: null }),
      ]),
    ).toEqual([])
  })
})
