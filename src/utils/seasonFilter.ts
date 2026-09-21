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

// 0=zima(gru-lut), 1=wiosna(mar-maj), 2=lato(cze-sie), 3=jesień(wrz-lis) - wydzielone z
// `getSeasonDotClass` (liczone tam z miesiąca startowego zakresu), żeby ta sama paleta dała się
// zastosować per-miesiąc w `SeasonCalendarStrip.tsx` (kalendarz sezonowy - Część 3 pkt 7
// UI-QOL-ROADMAP.md), nie tylko jako jedna kropka za cały zakres.
export function meteorologicalSeasonIndexForMonth(month: number): 0 | 1 | 2 | 3 {
  return Math.floor(((month + 1) % 12) / 3) as 0 | 1 | 2 | 3
}

export function seasonColorClassForMonth(month: number): string {
  return SEASON_DOT_CLASS[meteorologicalSeasonIndexForMonth(month)]
}

export function getSeasonDotClass(season: string): string {
  const range = parseSeasonRange(season)
  if (!range) return 'bg-muted-foreground'
  return seasonColorClassForMonth(range.startMonth)
}

export const MONTH_ABBR_PL = ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru']

// Rozwija zakres tekstowy ("Czerwiec - Październik") na 12-elementową maskę miesięcy (0=styczeń),
// z obsługą zakresu przechodzącego przez przełom roku (np. "Listopad - Luty") - ta sama logika
// wrap-around co `isInSeason`. Nieparsowalny format zwraca same `false` (kalendarz po prostu nic
// nie podświetli, tekstowy opis obok zostaje jedynym źródłem informacji - fail-open jak
// `isInSeason` nie ma tu zastosowania, bo to wizualizacja, nie filtr ukrywający dane).
export function getSeasonMonths(season: string): boolean[] {
  const months = new Array(12).fill(false)
  const range = parseSeasonRange(season)
  if (!range) return months
  if (range.startMonth <= range.endMonth) {
    for (let m = range.startMonth; m <= range.endMonth; m++) months[m] = true
  } else {
    for (let m = range.startMonth; m < 12; m++) months[m] = true
    for (let m = 0; m <= range.endMonth; m++) months[m] = true
  }
  return months
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

// "Za X dni zaczyna się sezon" (ROZBUDOWA-ROADMAP.md Część 2 pkt 5) - liczy dni do najbliższego
// 1. dnia miesiąca startowego zakresu sezonu, licząc od dzisiejszej daty (dzień, nie moment -
// obie daty sprowadzone do północy, żeby "jutro" zawsze dawało dokładnie 1, niezależnie o której
// godzinie apka jest otwarta). `null`, gdy już jest sezon (to nie jest "nadchodzące") albo gdy
// tekst sezonu się nie parsuje.
export function daysUntilSeasonStart(season: string, date: Date = new Date()): number | null {
  const range = parseSeasonRange(season)
  if (!range) return null
  if (isInSeason(season, date)) return null

  const today = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  let target = new Date(today.getFullYear(), range.startMonth, 1)
  if (target < today) target = new Date(today.getFullYear() + 1, range.startMonth, 1)

  return Math.round((target.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))
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
