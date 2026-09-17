import { describe, expect, it } from 'vitest'
import { szczecinSpots } from './szczecinSpots'

// Zgrubny prostokąt obejmujący Szczecin i okolice (promień ok. 60 km) - test strażniczy przeciw
// literówce we współrzędnych (np. zamienionej szerokości z długością), która przeniosłaby pinezkę
// w zupełnie inne miejsce na mapie bez żadnego widocznego błędu w kodzie.
const LAT_RANGE: [number, number] = [52.9, 53.9]
const LNG_RANGE: [number, number] = [13.9, 15.3]

describe('szczecinSpots', () => {
  it('każdy wpis ma unikalne id', () => {
    const ids = szczecinSpots.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('każdy wpis ma współrzędne w rozsądnym zasięgu Szczecina i okolic', () => {
    for (const spot of szczecinSpots) {
      expect(spot.latitude, `${spot.name}: latitude poza zasięgiem`).toBeGreaterThanOrEqual(LAT_RANGE[0])
      expect(spot.latitude, `${spot.name}: latitude poza zasięgiem`).toBeLessThanOrEqual(LAT_RANGE[1])
      expect(spot.longitude, `${spot.name}: longitude poza zasięgiem`).toBeGreaterThanOrEqual(LNG_RANGE[0])
      expect(spot.longitude, `${spot.name}: longitude poza zasięgiem`).toBeLessThanOrEqual(LNG_RANGE[1])
    }
  })

  it('każdy wpis ma źródło (adres URL) i niepusty opis', () => {
    for (const spot of szczecinSpots) {
      expect(spot.sourceUrl, `${spot.name}: brak sourceUrl`).toMatch(/^https:\/\//)
      expect(spot.description.length, `${spot.name}: pusty opis`).toBeGreaterThan(10)
    }
  })

  it('lista nie jest pusta', () => {
    expect(szczecinSpots.length).toBeGreaterThan(0)
  })
})
