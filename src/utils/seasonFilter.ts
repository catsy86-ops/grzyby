// Pole `season` w species.json to wolny tekst w formacie "MiesiącStart - MiesiącKoniec" (polskie
// nazwy miesięcy, patrz src/data/species.json). Parsujemy go, żeby dało się filtrować bazę wiedzy
// do gatunków "w sezonie teraz" - przydatne w terenie, żeby nie przewijać wszystkich pozycji.

const MONTHS_PL: Record<string, number> = {
  styczeń: 0,
  luty: 1,
  marzec: 2,
  kwiecień: 3,
  maj: 4,
  czerwiec: 5,
  lipiec: 6,
  sierpień: 7,
  wrzesień: 8,
  październik: 9,
  listopad: 10,
  grudzień: 11,
}

export interface SeasonRange {
  startMonth: number
  endMonth: number
}

export function parseSeasonRange(season: string): SeasonRange | null {
  const parts = season.split('-').map((s) => s.trim().toLowerCase())
  if (parts.length !== 2) return null
  const startMonth = MONTHS_PL[parts[0]]
  const endMonth = MONTHS_PL[parts[1]]
  if (startMonth === undefined || endMonth === undefined) return null
  return { startMonth, endMonth }
}

// Kolor kropki sezonu na karcie gatunku - meteorologiczna pora roku wyznaczona z miesiąca
// startowego zakresu (np. "Czerwiec - Październik" -> lato). To uproszczenie (realny sezon
// grzyba zwykle obejmuje 2 pory roku), ale wystarcza jako subtelny sygnał wizualny, nie
// precyzyjna klasyfikacja - pełny tekstowy zakres zostaje widoczny obok kropki.
// Paleta celowo NIE dotyka zielonego/żółtego/pomarańczowego/czerwonego - to skala jadalności
// (zobacz CARD_ACCENT w EdibilityBadge.tsx), zarezerwowana dla bezpieczeństwa. Wcześniejsza
// wersja tej palety używała yellow-500/orange-500 (lato/jesień) - dokładnie tych samych
// odcieni co warunkowo-jadalny/trujący, więc na karcie trującego gatunku jesienią kropka
// sezonu i pasek jadalności zlewały się w jeden sygnał "to jest pomarańczowe". Niebiesko-
// -fioletowa gama sezonu jest wizualnie jednoznacznie odrębna od skali bezpieczeństwa.
const SEASON_DOT_CLASS = ['bg-sky-500', 'bg-teal-500', 'bg-cyan-600', 'bg-violet-500'] as const

export function getSeasonDotClass(season: string): string {
  const range = parseSeasonRange(season)
  if (!range) return 'bg-muted-foreground'
  // 0=zima(gru-lut), 1=wiosna(mar-maj), 2=lato(cze-sie), 3=jesień(wrz-lis)
  const meteorologicalSeason = Math.floor(((range.startMonth + 1) % 12) / 3) as 0 | 1 | 2 | 3
  return SEASON_DOT_CLASS[meteorologicalSeason]
}

export type MeteorologicalSeason = 'zima' | 'wiosna' | 'lato' | 'jesien'
const METEOROLOGICAL_SEASONS: readonly MeteorologicalSeason[] = ['zima', 'wiosna', 'lato', 'jesien']

// Aktualna pora roku kalendarzowa (wg miesiąca, nie faktycznego przesilenia) - do sezonowego
// akcentu koloru marki (patrz `.season-*` w index.css, użycie w App.tsx). Ten sam podział
// miesięcy co w getSeasonDotClass wyżej (0=zima grudzień-luty, 1=wiosna, 2=lato, 3=jesień),
// wydzielony do osobnej funkcji, bo tu liczy się od aktualnej daty, nie od zakresu w species.json.
export function getCurrentSeason(date: Date = new Date()): MeteorologicalSeason {
  const month = date.getMonth() // 0 = styczeń
  return METEOROLOGICAL_SEASONS[Math.floor(((month + 1) % 12) / 3)]
}

// Fail-open: nieparsowalny/nietypowy format sezonu nigdy nie ukrywa gatunku (bezpieczniej pokazać
// za dużo niż przypadkiem odfiltrować coś, co akurat rośnie).
export function isInSeason(season: string, date: Date = new Date()): boolean {
  const range = parseSeasonRange(season)
  if (!range) return true

  const month = date.getMonth()
  if (range.startMonth <= range.endMonth) {
    return month >= range.startMonth && month <= range.endMonth
  }
  // zakres przechodzący przez przełom roku (np. "Listopad - Luty")
  return month >= range.startMonth || month <= range.endMonth
}
