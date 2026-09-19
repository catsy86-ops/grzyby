// MAP-ROADMAP.md, Część 1 #5 - "czy w tym miesiącu historycznie coś tu rosło". Łączy własną
// historię znalezisk w danym grzybowisku (Finding.spotId + Finding.createdAt) z aktualnym
// miesiącem - NIE z Species.season, bo to jest pytanie o "co Ty tu znalazłeś w tym miesiącu
// w poprzednich latach", nie "co teoretycznie mogłoby tu rosnąć wg atlasu". Ryzykowne przy
// małej próbce (roadmap: "1 znalezisko z zeszłego roku != pewność"), stąd próg minimalnej
// liczby pasujących znalezisk poniżej.

import type { Finding } from '../db/schema'

// Poniżej tego progu pojedyncze trafienie łatwo pomylić z przypadkiem (jeden spacer, jeden
// gatunek) - pierścień zapala się dopiero przy powtarzalności w tym samym miesiącu.
export const MIN_MATCHES_FOR_SEASONAL_RING = 2

// Znaleziska z bieżącego roku celowo pomijane - "sezonowość" ma sens jako sygnał z przeszłości
// ("w tym miesiącu zwykle coś tu jest"), nie jako echo tego, co sam użytkownik dopiero co tu
// zapisał w bieżącej wyprawie.
export function countPastSeasonalMatches(
  spotId: number,
  findings: Finding[],
  date: Date = new Date(),
): number {
  const month = date.getMonth()
  const year = date.getFullYear()
  return findings.filter((f) => {
    if (f.spotId !== spotId) return false
    const createdAt = new Date(f.createdAt)
    return createdAt.getFullYear() < year && createdAt.getMonth() === month
  }).length
}

export function hasSeasonalMatch(spotId: number, findings: Finding[], date: Date = new Date()): boolean {
  return countPastSeasonalMatches(spotId, findings, date) >= MIN_MATCHES_FOR_SEASONAL_RING
}
