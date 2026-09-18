import type { Finding, Trip } from '../db/schema'

export interface Achievement {
  id: string
  icon: string
  title: string
  description: string
}

export interface AchievementProgress extends Achievement {
  unlocked: boolean
  // `null` dla odznak binarnych (np. "znajdź borowika") - "0/1" nie niesie żadnej informacji,
  // której nie dawałby sam stan unlocked/locked, więc pasek postępu byłby tylko szumem.
  progress: { current: number; target: number } | null
}

export interface AchievementInput {
  findings: Finding[]
  // Tylko zakończone wyprawy - "sezonowy maratończyk" liczy realne, zamknięte wyjścia w teren,
  // nie tę wciąż trwającą.
  trips: Trip[]
  photoCount: number
}

function countDistinctSpecies(findings: Finding[]): number {
  return new Set(findings.map((f) => f.speciesId).filter((id): id is string => id != null)).size
}

function sumWeightGrams(findings: Finding[]): number {
  return findings.reduce((sum, f) => sum + (f.weightGrams ?? 0), 0)
}

// Największa liczba zakończonych wypraw przypadająca na jeden miesiąc kalendarzowy (dowolnego
// roku) - "sezonowy maratończyk" nagradza intensywny miesiąc, nie rozłożone w czasie 3 wyprawy
// przez pół roku.
function maxTripsInOneMonth(trips: Trip[]): number {
  const counts = new Map<string, number>()
  for (const trip of trips) {
    const date = new Date(trip.startedAt)
    const key = `${date.getFullYear()}-${date.getMonth()}`
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return counts.size === 0 ? 0 : Math.max(...counts.values())
}

// Największa liczba znalezisk przypadająca na jedno zapisane grzybowisko (spotId) - "stały
// gość" nagradza wracanie w sprawdzone miejsce, nie samą liczbę znalezisk w ogóle.
function maxFindingsAtOneSpot(findings: Finding[]): number {
  const counts = new Map<number, number>()
  for (const finding of findings) {
    if (finding.spotId == null) continue
    counts.set(finding.spotId, (counts.get(finding.spotId) ?? 0) + 1)
  }
  return counts.size === 0 ? 0 : Math.max(...counts.values())
}

// Osiągnięcia liczone WYŁĄCZNIE z liczby/różnorodności/regularności wpisów - celowo nie dotykają
// danych o spożyciu/reakcjach (Finding.consumed/reactionSeverity) ani jadalności gatunku. To dane
// bezpieczeństwa, nie materiał do gamifikacji - trywializowanie ich odznaką (np. "zjadłeś coś
// trującego i przeżyłeś") byłoby nieodpowiedzialne przy apce dot. rozpoznawania grzybów.
const ACHIEVEMENTS: (Achievement & {
  check: (input: AchievementInput) => boolean
  progress?: (input: AchievementInput) => { current: number; target: number }
})[] = [
  {
    id: 'pierwsze-znalezisko',
    icon: '🍄',
    title: 'Pierwsze znalezisko',
    description: 'Zapisz swoje pierwsze znalezisko w dzienniku.',
    check: ({ findings }) => findings.length >= 1,
  },
  {
    id: 'kolekcjoner',
    icon: '📚',
    title: 'Kolekcjoner',
    description: 'Zapisz 10 znalezisk.',
    check: ({ findings }) => findings.length >= 10,
    progress: ({ findings }) => ({ current: findings.length, target: 10 }),
  },
  {
    id: 'mistrz-grzybiarz',
    icon: '🏆',
    title: 'Mistrz grzybiarz',
    description: 'Zapisz 50 znalezisk.',
    check: ({ findings }) => findings.length >= 50,
    progress: ({ findings }) => ({ current: findings.length, target: 50 }),
  },
  {
    id: 'legenda-lasu',
    icon: '👑',
    title: 'Legenda lasu',
    description: 'Zapisz 100 znalezisk.',
    check: ({ findings }) => findings.length >= 100,
    progress: ({ findings }) => ({ current: findings.length, target: 100 }),
  },
  {
    id: 'roznorodnosc',
    icon: '🌈',
    title: 'Różnorodność',
    description: 'Znajdź 5 różnych gatunków.',
    check: ({ findings }) => countDistinctSpecies(findings) >= 5,
    progress: ({ findings }) => ({ current: countDistinctSpecies(findings), target: 5 }),
  },
  {
    id: 'kolekcjoner-gatunkow',
    icon: '🌟',
    title: 'Kolekcjoner gatunków',
    description: 'Znajdź 10 różnych gatunków.',
    check: ({ findings }) => countDistinctSpecies(findings) >= 10,
    progress: ({ findings }) => ({ current: countDistinctSpecies(findings), target: 10 }),
  },
  {
    id: 'borowikowy-debiut',
    icon: '🥇',
    title: 'Borowikowy debiut',
    description: 'Znajdź borowika szlachetnego - króla grzybów.',
    check: ({ findings }) => findings.some((f) => f.speciesId === 'borowik-szlachetny'),
  },
  {
    id: 'wyprawowicz',
    icon: '🥾',
    title: 'Wyprawowicz',
    description: 'Zakończ 5 wypraw.',
    check: ({ trips }) => trips.length >= 5,
    progress: ({ trips }) => ({ current: trips.length, target: 5 }),
  },
  {
    id: 'sezonowy-maratonczyk',
    icon: '🔥',
    title: 'Sezonowy maratończyk',
    description: 'Zakończ 3 wyprawy w jednym miesiącu.',
    check: ({ trips }) => maxTripsInOneMonth(trips) >= 3,
    progress: ({ trips }) => ({ current: maxTripsInOneMonth(trips), target: 3 }),
  },
  {
    id: 'staly-gosc',
    icon: '📍',
    title: 'Stały gość',
    description: 'Znajdź coś w tym samym grzybowisku 5 razy.',
    check: ({ findings }) => maxFindingsAtOneSpot(findings) >= 5,
    progress: ({ findings }) => ({ current: maxFindingsAtOneSpot(findings), target: 5 }),
  },
  {
    id: 'ciezka-zdobycz',
    icon: '🎒',
    title: 'Ciężka zdobycz',
    description: 'Zbierz łącznie 5 kg grzybów.',
    check: ({ findings }) => sumWeightGrams(findings) >= 5000,
    progress: ({ findings }) => ({ current: Math.round(sumWeightGrams(findings) / 100) / 10, target: 5 }),
  },
  {
    id: 'fotograf',
    icon: '📸',
    title: 'Fotograf',
    description: 'Zapisz 10 zdjęć znalezisk.',
    check: ({ photoCount }) => photoCount >= 10,
    progress: ({ photoCount }) => ({ current: photoCount, target: 10 }),
  },
]

export function computeAchievements(input: AchievementInput): AchievementProgress[] {
  return ACHIEVEMENTS.map(({ check, progress, ...achievement }) => ({
    ...achievement,
    unlocked: check(input),
    progress: progress ? progress(input) : null,
  }))
}
