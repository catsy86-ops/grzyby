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
