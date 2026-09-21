import { describe, expect, it } from 'vitest'
import type { Finding, Trip } from '../db/schema'
import {
  computeRainyTripInsight,
  countSpeciesDiversity,
  daysSinceLastTrip,
  formatDuration,
  formatWeight,
  groupFindingsBySpeciesCount,
  groupFindingsByYear,
  isLongTrip,
  LONG_TRIP_THRESHOLD_MS,
  sumWeightGrams,
  yearOverYearDelta,
} from './tripStats'

function makeTrip(overrides: Partial<Trip> = {}): Trip {
  return { startedAt: Date.now(), endedAt: null, name: 'Wyprawa', notes: '', ...overrides }
}

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

describe('countSpeciesDiversity', () => {
  it('liczy unikalne speciesId, ignorując null', () => {
    const findings = [
      makeFinding({ speciesId: 'a' }),
      makeFinding({ speciesId: 'b' }),
      makeFinding({ speciesId: 'a' }),
      makeFinding({ speciesId: null }),
    ]
    expect(countSpeciesDiversity(findings)).toBe(2)
  })

  it('zwraca 0 dla pustej listy', () => {
    expect(countSpeciesDiversity([])).toBe(0)
  })
})

describe('groupFindingsBySpeciesCount', () => {
  it('sums quantity per species instead of counting entries, defaulting missing quantity to 1', () => {
    const findings = [
      makeFinding({ speciesId: 'borowik', quantity: 5 }),
      makeFinding({ speciesId: 'borowik', quantity: 2 }),
      makeFinding({ speciesId: 'borowik' }), // brak quantity - liczy się jako 1
      makeFinding({ speciesId: 'kurka', quantity: 3 }),
    ]
    const result = groupFindingsBySpeciesCount(findings)
    expect(result).toEqual([
      { speciesId: 'borowik', count: 8 },
      { speciesId: 'kurka', count: 3 },
    ])
  })
})

describe('sumWeightGrams', () => {
  it('sumuje tylko znaleziska z podaną wagą, traktując brak jako 0', () => {
    const findings = [
      makeFinding({ weightGrams: 150 }),
      makeFinding({ weightGrams: 300 }),
      makeFinding({}),
    ]
    expect(sumWeightGrams(findings)).toBe(450)
  })

  it('zwraca 0 dla pustej listy', () => {
    expect(sumWeightGrams([])).toBe(0)
  })
})

describe('formatWeight', () => {
  it('formatuje gramy poniżej 1000 jako "g"', () => {
    expect(formatWeight(450)).toBe('450 g')
  })

  it('formatuje 1000+ gramów jako "kg" z jednym miejscem po przecinku', () => {
    expect(formatWeight(2350)).toBe('2.4 kg')
  })
})

describe('formatDuration', () => {
  it('formatuje pełne godziny i minuty', () => {
    const started = Date.now() - (2 * 60 + 15) * 60_000
    expect(formatDuration(started, null)).toBe('2 godz. 15 min')
  })

  it('formatuje same minuty, gdy mniej niż godzina', () => {
    const started = Date.now() - 40 * 60_000
    expect(formatDuration(started, null)).toBe('40 min')
  })

  it('formatuje same godziny, gdy bez reszty minut', () => {
    const started = Date.now() - 3 * 60 * 60_000
    expect(formatDuration(started, null)).toBe('3 godz.')
  })

  it('zwraca "<1 min" dla bardzo krótkiego czasu', () => {
    expect(formatDuration(Date.now(), null)).toBe('<1 min')
  })

  it('liczy czas do endedAt zamiast do teraz, gdy podane', () => {
    const started = 0
    const ended = 90 * 60_000
    expect(formatDuration(started, ended)).toBe('1 godz. 30 min')
  })
})

describe('isLongTrip', () => {
  it('zwraca false, gdy wyprawa trwa krócej niż próg', () => {
    const now = 1_000_000
    expect(isLongTrip(now - (LONG_TRIP_THRESHOLD_MS - 1), now)).toBe(false)
  })

  it('zwraca true, gdy wyprawa trwa dokładnie tyle co próg lub dłużej', () => {
    const now = 1_000_000
    expect(isLongTrip(now - LONG_TRIP_THRESHOLD_MS, now)).toBe(true)
    expect(isLongTrip(now - LONG_TRIP_THRESHOLD_MS - 1, now)).toBe(true)
  })
})

describe('groupFindingsByYear', () => {
  it('grupuje znaleziska wg roku createdAt', () => {
    const findings = [
      makeFinding({ createdAt: new Date('2025-08-01').getTime() }),
      makeFinding({ createdAt: new Date('2026-09-01').getTime() }),
      makeFinding({ createdAt: new Date('2026-09-15').getTime() }),
    ]
    const byYear = groupFindingsByYear(findings)
    expect(byYear.get(2025)?.length).toBe(1)
    expect(byYear.get(2026)?.length).toBe(2)
    expect(byYear.has(2024)).toBe(false)
  })
})

describe('yearOverYearDelta', () => {
  it('liczy procentową zmianę względem poprzedniego roku', () => {
    expect(yearOverYearDelta(12, 10)).toBe(20)
    expect(yearOverYearDelta(5, 10)).toBe(-50)
  })

  it('zwraca null, gdy brak danych z poprzedniego roku', () => {
    expect(yearOverYearDelta(5, 0)).toBeNull()
  })
})

describe('daysSinceLastTrip', () => {
  const DAY_MS = 24 * 60 * 60 * 1000
  const now = new Date('2026-09-21T12:00:00Z').getTime()

  it('zwraca null, gdy brak wypraw', () => {
    expect(daysSinceLastTrip([], now)).toBeNull()
  })

  it('liczy dni od najnowszej (najpóźniej rozpoczętej) wyprawy, ignorując starsze', () => {
    const trips = [
      makeTrip({ startedAt: now - 10 * DAY_MS }),
      makeTrip({ startedAt: now - 3 * DAY_MS }),
      makeTrip({ startedAt: now - 20 * DAY_MS }),
    ]
    expect(daysSinceLastTrip(trips, now)).toBe(3)
  })

  it('zwraca 0 dla wyprawy rozpoczętej dziś', () => {
    expect(daysSinceLastTrip([makeTrip({ startedAt: now })], now)).toBe(0)
  })
})

describe('computeRainyTripInsight', () => {
  function tripWithFindings(id: number, wasRainy: boolean | undefined, findingCount: number) {
    const trip = makeTrip({ id, wasRainy })
    const findings = Array.from({ length: findingCount }, () => makeFinding({ tripId: id }))
    return { trip, findings }
  }

  it('zwraca null, gdy za mało wypraw w którejś grupie (próg 3)', () => {
    const rainy = [tripWithFindings(1, true, 5), tripWithFindings(2, true, 5)]
    const dry = [tripWithFindings(3, false, 1), tripWithFindings(4, false, 1), tripWithFindings(5, false, 1)]
    const all = [...rainy, ...dry]
    expect(computeRainyTripInsight(all.map((x) => x.trip), all.flatMap((x) => x.findings))).toBeNull()
  })

  it('zwraca null, gdy żadna wyprawa nie ma zapisanego wasRainy', () => {
    const trips = [makeTrip({ id: 1 }), makeTrip({ id: 2 }), makeTrip({ id: 3 })]
    expect(computeRainyTripInsight(trips, [])).toBeNull()
  })

  it('liczy średnią liczbę znalezisk per wyprawa osobno dla deszczowych i suchych', () => {
    const entries = [
      tripWithFindings(1, true, 6),
      tripWithFindings(2, true, 4),
      tripWithFindings(3, true, 8),
      tripWithFindings(4, false, 2),
      tripWithFindings(5, false, 0),
      tripWithFindings(6, false, 1),
    ]
    const result = computeRainyTripInsight(entries.map((e) => e.trip), entries.flatMap((e) => e.findings))
    expect(result).not.toBeNull()
    expect(result!.avgFindingsRainy).toBe(6)
    expect(result!.avgFindingsDry).toBe(1)
    expect(result!.rainyTripCount).toBe(3)
    expect(result!.dryTripCount).toBe(3)
  })

  it('ignoruje wyprawy bez id lub bez zapisanego wasRainy', () => {
    const entries = [
      tripWithFindings(1, true, 5),
      tripWithFindings(2, true, 5),
      tripWithFindings(3, true, 5),
      tripWithFindings(4, false, 1),
      tripWithFindings(5, false, 1),
      tripWithFindings(6, false, 1),
      tripWithFindings(7, undefined, 100),
    ]
    const result = computeRainyTripInsight(entries.map((e) => e.trip), entries.flatMap((e) => e.findings))
    expect(result!.rainyTripCount).toBe(3)
    expect(result!.dryTripCount).toBe(3)
  })
})
