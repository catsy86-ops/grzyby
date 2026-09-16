import type { Finding } from '../db/schema'

export interface Achievement {
  id: string
  icon: string
  title: string
  description: string
}

export interface AchievementProgress extends Achievement {
  unlocked: boolean
}

export interface AchievementInput {
  findings: Finding[]
  completedTripsCount: number
  photoCount: number
}

function countDistinctSpecies(findings: Finding[]): number {
  return new Set(findings.map((f) => f.speciesId).filter((id): id is string => id != null)).size
}

// Osiągnięcia liczone WYŁĄCZNIE z liczby/różnorodności wpisów - celowo nie dotykają danych o
// spożyciu/reakcjach (Finding.consumed/reactionSeverity) ani jadalności gatunku. To dane
// bezpieczeństwa, nie materiał do gamifikacji - trywializowanie ich odznaką (np. "zjadłeś coś
// trującego i przeżyłeś") byłoby nieodpowiedzialne przy apce dot. rozpoznawania grzybów.
const ACHIEVEMENTS: (Achievement & { check: (input: AchievementInput) => boolean })[] = [
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
  },
  {
    id: 'mistrz-grzybiarz',
    icon: '🏆',
    title: 'Mistrz grzybiarz',
    description: 'Zapisz 50 znalezisk.',
    check: ({ findings }) => findings.length >= 50,
  },
  {
    id: 'roznorodnosc',
    icon: '🌈',
    title: 'Różnorodność',
    description: 'Znajdź 5 różnych gatunków.',
    check: ({ findings }) => countDistinctSpecies(findings) >= 5,
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
    check: ({ completedTripsCount }) => completedTripsCount >= 5,
  },
  {
    id: 'fotograf',
    icon: '📸',
    title: 'Fotograf',
    description: 'Zapisz 10 zdjęć znalezisk.',
    check: ({ photoCount }) => photoCount >= 10,
  },
]

export function computeAchievements(input: AchievementInput): AchievementProgress[] {
  return ACHIEVEMENTS.map(({ check, ...achievement }) => ({ ...achievement, unlocked: check(input) }))
}
