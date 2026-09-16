import { describe, expect, it } from 'vitest'
import { computeAchievements } from './achievements'
import type { Finding } from '../db/schema'

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

function unlockedIds(input: Parameters<typeof computeAchievements>[0]): string[] {
  return computeAchievements(input)
    .filter((a) => a.unlocked)
    .map((a) => a.id)
}

describe('computeAchievements', () => {
  it('nic nie jest odblokowane bez znalezisk/wypraw/zdjęć', () => {
    expect(unlockedIds({ findings: [], completedTripsCount: 0, photoCount: 0 })).toEqual([])
  })

  it('"Pierwsze znalezisko" odblokowuje się po 1 wpisie', () => {
    const ids = unlockedIds({ findings: [makeFinding()], completedTripsCount: 0, photoCount: 0 })
    expect(ids).toContain('pierwsze-znalezisko')
    expect(ids).not.toContain('kolekcjoner')
  })

  it('"Kolekcjoner" wymaga 10 znalezisk', () => {
    const findings = Array.from({ length: 9 }, () => makeFinding())
    expect(unlockedIds({ findings, completedTripsCount: 0, photoCount: 0 })).not.toContain('kolekcjoner')

    findings.push(makeFinding())
    expect(unlockedIds({ findings, completedTripsCount: 0, photoCount: 0 })).toContain('kolekcjoner')
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
    expect(unlockedIds({ findings, completedTripsCount: 0, photoCount: 0 })).not.toContain('roznorodnosc')

    findings.push(makeFinding({ speciesId: 'e' }))
    expect(unlockedIds({ findings, completedTripsCount: 0, photoCount: 0 })).toContain('roznorodnosc')
  })

  it('"Borowikowy debiut" wymaga konkretnego speciesId', () => {
    expect(
      unlockedIds({ findings: [makeFinding({ speciesId: 'muchomor-czerwony' })], completedTripsCount: 0, photoCount: 0 }),
    ).not.toContain('borowikowy-debiut')

    expect(
      unlockedIds({ findings: [makeFinding({ speciesId: 'borowik-szlachetny' })], completedTripsCount: 0, photoCount: 0 }),
    ).toContain('borowikowy-debiut')
  })

  it('"Wyprawowicz" liczy zakończone wyprawy, nie znaleziska', () => {
    expect(unlockedIds({ findings: [], completedTripsCount: 4, photoCount: 0 })).not.toContain('wyprawowicz')
    expect(unlockedIds({ findings: [], completedTripsCount: 5, photoCount: 0 })).toContain('wyprawowicz')
  })

  it('"Fotograf" liczy zdjęcia, nie znaleziska', () => {
    expect(unlockedIds({ findings: [], completedTripsCount: 0, photoCount: 9 })).not.toContain('fotograf')
    expect(unlockedIds({ findings: [], completedTripsCount: 0, photoCount: 10 })).toContain('fotograf')
  })

  it('nie ujawnia danych o spożyciu/reakcjach w żadnym osiągnięciu (bezpieczeństwo, nie gamifikacja)', () => {
    const findings = [makeFinding({ reactionSeverity: 'ciężka', consumed: true })]
    const achievements = computeAchievements({ findings, completedTripsCount: 0, photoCount: 0 })
    for (const a of achievements) {
      expect(a.title.toLowerCase()).not.toMatch(/reakcj|zatru|spoż/)
      expect(a.description.toLowerCase()).not.toMatch(/reakcj|zatru|spoż/)
    }
  })
})
