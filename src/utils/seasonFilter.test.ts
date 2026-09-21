import { describe, expect, it } from 'vitest'
import { daysUntilSeasonStart, getCurrentSeason, getSeasonMonths, isInSeason, parseSeasonRange } from './seasonFilter'
import speciesData from '../data/species.json'

describe('parseSeasonRange', () => {
  it('parsuje standardowy zakres "Miesiąc - Miesiąc"', () => {
    expect(parseSeasonRange('Czerwiec - październik')).toEqual({ startMonth: 5, endMonth: 9 })
  })

  it('jest niewrażliwy na wielkość liter', () => {
    expect(parseSeasonRange('KWIECIEŃ - Maj')).toEqual({ startMonth: 3, endMonth: 4 })
  })

  it('zwraca null dla niepoprawnego formatu', () => {
    expect(parseSeasonRange('cały rok')).toBeNull()
    expect(parseSeasonRange('Marzec')).toBeNull()
    expect(parseSeasonRange('Nieznany - Maj')).toBeNull()
  })

  it('wszystkie sezony w species.json parsują się poprawnie (test strażniczy)', () => {
    for (const s of speciesData as { id: string; season: string }[]) {
      expect(parseSeasonRange(s.season), `season "${s.season}" gatunku ${s.id} powinien się sparsować`).not.toBeNull()
    }
  })
})

describe('isInSeason', () => {
  it('zwraca true w środku standardowego zakresu', () => {
    expect(isInSeason('Czerwiec - październik', new Date(2026, 7, 15))).toBe(true) // sierpień
  })

  it('zwraca false poza zakresem', () => {
    expect(isInSeason('Czerwiec - październik', new Date(2026, 0, 15))).toBe(false) // styczeń
  })

  it('jest inkluzywny na granicach zakresu', () => {
    expect(isInSeason('Czerwiec - październik', new Date(2026, 5, 1))).toBe(true) // 1 czerwca
    expect(isInSeason('Czerwiec - październik', new Date(2026, 9, 31))).toBe(true) // 31 października
  })

  it('obsługuje zakres przechodzący przez przełom roku', () => {
    expect(isInSeason('Listopad - luty', new Date(2026, 11, 25))).toBe(true) // grudzień
    expect(isInSeason('Listopad - luty', new Date(2026, 6, 1))).toBe(false) // lipiec
  })

  it('domyślnie true (fail-open) dla nieparsowalnego formatu', () => {
    expect(isInSeason('cały rok', new Date(2026, 0, 1))).toBe(true)
  })
})

describe('getSeasonMonths', () => {
  it('zaznacza wyłącznie miesiące w standardowym zakresie', () => {
    const months = getSeasonMonths('Czerwiec - październik')
    expect(months).toEqual([false, false, false, false, false, true, true, true, true, true, false, false])
  })

  it('obsługuje zakres przechodzący przez przełom roku', () => {
    const months = getSeasonMonths('Listopad - luty')
    expect(months).toEqual([true, true, false, false, false, false, false, false, false, false, true, true])
  })

  it('zwraca same false dla nieparsowalnego formatu', () => {
    expect(getSeasonMonths('cały rok')).toEqual(new Array(12).fill(false))
  })
})

describe('getCurrentSeason', () => {
  it('rozpoznaje zimę (grudzień-luty)', () => {
    expect(getCurrentSeason(new Date(2026, 11, 25))).toBe('zima')
    expect(getCurrentSeason(new Date(2026, 0, 1))).toBe('zima')
    expect(getCurrentSeason(new Date(2026, 1, 28))).toBe('zima')
  })

  it('rozpoznaje wiosnę (marzec-maj)', () => {
    expect(getCurrentSeason(new Date(2026, 2, 1))).toBe('wiosna')
    expect(getCurrentSeason(new Date(2026, 4, 31))).toBe('wiosna')
  })

  it('rozpoznaje lato (czerwiec-sierpień)', () => {
    expect(getCurrentSeason(new Date(2026, 5, 1))).toBe('lato')
    expect(getCurrentSeason(new Date(2026, 7, 31))).toBe('lato')
  })

  it('rozpoznaje jesień (wrzesień-listopad)', () => {
    expect(getCurrentSeason(new Date(2026, 8, 1))).toBe('jesien')
    expect(getCurrentSeason(new Date(2026, 10, 30))).toBe('jesien')
  })
})

describe('daysUntilSeasonStart', () => {
  it('zwraca null, gdy sezon już trwa', () => {
    expect(daysUntilSeasonStart('Czerwiec - Październik', new Date(2026, 7, 15))).toBeNull()
  })

  it('zwraca null dla nieparsowalnego formatu', () => {
    expect(daysUntilSeasonStart('cały rok', new Date(2026, 0, 1))).toBeNull()
  })

  it('liczy dni do najbliższego startu sezonu w tym samym roku', () => {
    // 1 stycznia -> sezon zaczyna się 1 czerwca (miesiąc 5) tego samego roku
    expect(daysUntilSeasonStart('Czerwiec - Październik', new Date(2026, 0, 1))).toBe(151)
  })

  it('zawija na następny rok, gdy sezon w tym roku już minął', () => {
    // 15 listopada, sezon Czerwiec-Październik już minął -> licz do 1 czerwca przyszłego roku
    const result = daysUntilSeasonStart('Czerwiec - Październik', new Date(2026, 10, 15))
    expect(result).toBeGreaterThan(180)
    expect(result).toBeLessThan(220)
  })

  it('zwraca 1 dzień przed startem sezonu', () => {
    expect(daysUntilSeasonStart('Czerwiec - Październik', new Date(2026, 4, 31))).toBe(1)
  })
})
