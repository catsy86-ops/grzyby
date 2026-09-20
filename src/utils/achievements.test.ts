import { describe, expect, it } from 'vitest'
import { computeAchievements } from './achievements'
import type { Finding, Trip } from '../db/schema'

function makeFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    speciesId: null,
    speciesNameGuess: null,
    latitude: null,
    longitude: null,
    notes: '',
    createdAt: Date.now(),
    ...overrides,
  }
}

function makeTrip(overrides: Partial<Trip> = {}): Trip {
  return {
    name: 'Wyprawa',
    startedAt: Date.now(),
    endedAt: Date.now(),
    notes: '',
    ...overrides,
  }
}

function unlockedIds(input: Parameters<typeof computeAchievements>[0]): string[] {
  return computeAchievements(input)
    .filter((a) => a.unlocked)
    .map((a) => a.id)
}

const EMPTY = { findings: [], trips: [], photoCount: 0 }

describe('computeAchievements', () => {
  it('nic nie jest odblokowane bez znalezisk/wypraw/zdjęć', () => {
    expect(unlockedIds(EMPTY)).toEqual([])
  })

  it('"Pierwsze znalezisko" odblokowuje się po 1 wpisie', () => {
    const ids = unlockedIds({ ...EMPTY, findings: [makeFinding()] })
    expect(ids).toContain('pierwsze-znalezisko')
    expect(ids).not.toContain('kolekcjoner')
  })

  it('"Kolekcjoner" wymaga 10 znalezisk i pokazuje postęp', () => {
    const findings = Array.from({ length: 9 }, () => makeFinding())
    const almost = computeAchievements({ ...EMPTY, findings })
    expect(almost.find((a) => a.id === 'kolekcjoner')?.unlocked).toBe(false)
    expect(almost.find((a) => a.id === 'kolekcjoner')?.progress).toEqual({ current: 9, target: 10 })

    findings.push(makeFinding())
    expect(unlockedIds({ ...EMPTY, findings })).toContain('kolekcjoner')
  })

  it('"Legenda lasu" wymaga 100 znalezisk', () => {
    const findings99 = Array.from({ length: 99 }, () => makeFinding())
    expect(unlockedIds({ ...EMPTY, findings: findings99 })).not.toContain('legenda-lasu')

    const findings100 = Array.from({ length: 100 }, () => makeFinding())
    expect(unlockedIds({ ...EMPTY, findings: findings100 })).toContain('legenda-lasu')
  })

  it('"Różnorodność" liczy unikalne speciesId, ignorując null', () => {
    const findings = [
      makeFinding({ speciesId: 'a' }),
      makeFinding({ speciesId: 'a' }),
      makeFinding({ speciesId: 'b' }),
      makeFinding({ speciesId: 'c' }),
      makeFinding({ speciesId: null }),
      makeFinding({ speciesId: 'd' }),
    ]
    expect(unlockedIds({ ...EMPTY, findings })).not.toContain('roznorodnosc')

    findings.push(makeFinding({ speciesId: 'e' }))
    expect(unlockedIds({ ...EMPTY, findings })).toContain('roznorodnosc')
  })

  it('"Kolekcjoner gatunków" wymaga 10 różnych gatunków', () => {
    const findings9 = Array.from({ length: 9 }, (_, i) => makeFinding({ speciesId: `s${i}` }))
    expect(unlockedIds({ ...EMPTY, findings: findings9 })).not.toContain('kolekcjoner-gatunkow')

    const findings10 = Array.from({ length: 10 }, (_, i) => makeFinding({ speciesId: `s${i}` }))
    expect(unlockedIds({ ...EMPTY, findings: findings10 })).toContain('kolekcjoner-gatunkow')
  })

  it('"Borowikowy debiut" wymaga konkretnego speciesId', () => {
    expect(
      unlockedIds({ ...EMPTY, findings: [makeFinding({ speciesId: 'muchomor-czerwony' })] }),
    ).not.toContain('borowikowy-debiut')

    expect(
      unlockedIds({ ...EMPTY, findings: [makeFinding({ speciesId: 'borowik-szlachetny' })] }),
    ).toContain('borowikowy-debiut')

    const borowikAchievement = computeAchievements({
      ...EMPTY,
      findings: [makeFinding({ speciesId: 'borowik-szlachetny' })],
    }).find((a) => a.id === 'borowikowy-debiut')
    expect(borowikAchievement?.progress).toBeNull()
  })

  it('"Wyprawowicz" liczy zakończone wyprawy, nie znaleziska', () => {
    expect(unlockedIds({ ...EMPTY, trips: Array.from({ length: 4 }, () => makeTrip()) })).not.toContain(
      'wyprawowicz',
    )
    expect(unlockedIds({ ...EMPTY, trips: Array.from({ length: 5 }, () => makeTrip()) })).toContain(
      'wyprawowicz',
    )
  })

  it('"Sezonowy maratończyk" wymaga 3 wypraw w JEDNYM miesiącu, nie rozłożonych w czasie', () => {
    const spreadOut = [
      makeTrip({ startedAt: new Date(2026, 0, 1).getTime() }),
      makeTrip({ startedAt: new Date(2026, 3, 1).getTime() }),
      makeTrip({ startedAt: new Date(2026, 6, 1).getTime() }),
    ]
    expect(unlockedIds({ ...EMPTY, trips: spreadOut })).not.toContain('sezonowy-maratonczyk')

    const sameMonth = [
      makeTrip({ startedAt: new Date(2026, 8, 1).getTime() }),
      makeTrip({ startedAt: new Date(2026, 8, 10).getTime() }),
      makeTrip({ startedAt: new Date(2026, 8, 20).getTime() }),
    ]
    expect(unlockedIds({ ...EMPTY, trips: sameMonth })).toContain('sezonowy-maratonczyk')
  })

  it('"Stały gość" wymaga 5 znalezisk w tym samym grzybowisku', () => {
    const scattered = [
      makeFinding({ spotId: 1 }),
      makeFinding({ spotId: 2 }),
      makeFinding({ spotId: 1 }),
      makeFinding({ spotId: 3 }),
    ]
    expect(unlockedIds({ ...EMPTY, findings: scattered })).not.toContain('staly-gosc')

    const sameSpot = Array.from({ length: 5 }, () => makeFinding({ spotId: 1 }))
    expect(unlockedIds({ ...EMPTY, findings: sameSpot })).toContain('staly-gosc')
  })

  it('"Ciężka zdobycz" wymaga 5 kg łącznej wagi', () => {
    expect(unlockedIds({ ...EMPTY, findings: [makeFinding({ weightGrams: 4999 })] })).not.toContain(
      'ciezka-zdobycz',
    )
    expect(
      unlockedIds({ ...EMPTY, findings: [makeFinding({ weightGrams: 3000 }), makeFinding({ weightGrams: 2000 })] }),
    ).toContain('ciezka-zdobycz')
  })

  it('"Fotograf" liczy zdjęcia, nie znaleziska', () => {
    expect(unlockedIds({ ...EMPTY, photoCount: 9 })).not.toContain('fotograf')
    expect(unlockedIds({ ...EMPTY, photoCount: 10 })).toContain('fotograf')
  })

  it('"Pierwsza wyprawa" odblokowuje się po 1 zakończonej wyprawie, "Weteran szlaku" po 10', () => {
    expect(unlockedIds({ ...EMPTY, trips: [makeTrip()] })).toContain('pierwsza-wyprawa')
    expect(unlockedIds(EMPTY)).not.toContain('pierwsza-wyprawa')

    expect(unlockedIds({ ...EMPTY, trips: Array.from({ length: 9 }, () => makeTrip()) })).not.toContain(
      'weteran-szlaku',
    )
    expect(unlockedIds({ ...EMPTY, trips: Array.from({ length: 10 }, () => makeTrip()) })).toContain(
      'weteran-szlaku',
    )
  })

  it('"Jesienny grzybiarz" wymaga wyprawy we wrześniu-listopadzie', () => {
    expect(
      unlockedIds({ ...EMPTY, trips: [makeTrip({ startedAt: new Date(2026, 5, 1).getTime() })] }),
    ).not.toContain('jesienny-grzybiarz')
    expect(
      unlockedIds({ ...EMPTY, trips: [makeTrip({ startedAt: new Date(2026, 9, 1).getTime() })] }),
    ).toContain('jesienny-grzybiarz')
  })

  it('"Grzybobranie w deszczu" wymaga wyprawy z wasRainy=true', () => {
    expect(unlockedIds({ ...EMPTY, trips: [makeTrip({ wasRainy: false })] })).not.toContain(
      'grzybobranie-w-deszczu',
    )
    expect(unlockedIds({ ...EMPTY, trips: [makeTrip()] })).not.toContain('grzybobranie-w-deszczu')
    expect(unlockedIds({ ...EMPTY, trips: [makeTrip({ wasRainy: true })] })).toContain(
      'grzybobranie-w-deszczu',
    )
  })

  it('"Paparazzo" wymaga 25 zdjęć', () => {
    expect(unlockedIds({ ...EMPTY, photoCount: 24 })).not.toContain('paparazzo')
    expect(unlockedIds({ ...EMPTY, photoCount: 25 })).toContain('paparazzo')
  })

  it('nie ujawnia danych o spożyciu/reakcjach w żadnym osiągnięciu (bezpieczeństwo, nie gamifikacja)', () => {
    const findings = [makeFinding({ reactionSeverity: 'ciężka', consumed: true })]
    const achievements = computeAchievements({ ...EMPTY, findings })
    for (const a of achievements) {
      expect(a.title.toLowerCase()).not.toMatch(/reakcj|zatru|spoż/)
      expect(a.description.toLowerCase()).not.toMatch(/reakcj|zatru|spoż/)
    }
  })
})
