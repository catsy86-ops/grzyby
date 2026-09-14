import { describe, expect, it } from 'vitest'
import { formatDistance, getBearingDegrees, getCardinalDirection, getDistanceMeters } from './bearing'

describe('getDistanceMeters', () => {
  it('zwraca 0 dla identycznych punktów', () => {
    expect(getDistanceMeters([52.0, 19.0], [52.0, 19.0])).toBe(0)
  })

  it('liczy realny dystans - Warszawa - Kraków ok. 252 km', () => {
    const warszawa: [number, number] = [52.2297, 21.0122]
    const krakow: [number, number] = [50.0647, 19.945]
    const distance = getDistanceMeters(warszawa, krakow)
    expect(distance).toBeGreaterThan(250_000)
    expect(distance).toBeLessThan(255_000)
  })

  it('1 stopień szerokości geograficznej to ok. 111 km', () => {
    const distance = getDistanceMeters([52.0, 19.0], [53.0, 19.0])
    expect(distance).toBeGreaterThan(110_000)
    expect(distance).toBeLessThan(112_000)
  })
})

describe('getBearingDegrees', () => {
  it('zwraca ok. 0 (północ) dla punktu bezpośrednio na północ', () => {
    const bearing = getBearingDegrees([52.0, 19.0], [53.0, 19.0])
    expect(bearing).toBeCloseTo(0, 0)
  })

  it('zwraca ok. 90 (wschód) dla punktu bezpośrednio na wschód (na równiku)', () => {
    const bearing = getBearingDegrees([0, 19.0], [0, 20.0])
    expect(bearing).toBeCloseTo(90, 0)
  })

  it('zwraca ok. 180 (południe) dla punktu bezpośrednio na południe', () => {
    const bearing = getBearingDegrees([52.0, 19.0], [51.0, 19.0])
    expect(bearing).toBeCloseTo(180, 0)
  })

  it('zwraca wartość w zakresie [0, 360)', () => {
    const bearing = getBearingDegrees([52.0, 19.0], [51.5, 18.0])
    expect(bearing).toBeGreaterThanOrEqual(0)
    expect(bearing).toBeLessThan(360)
  })
})

describe('getCardinalDirection', () => {
  it('mapuje azymuty na strony świata', () => {
    expect(getCardinalDirection(0)).toBe('N')
    expect(getCardinalDirection(45)).toBe('NE')
    expect(getCardinalDirection(90)).toBe('E')
    expect(getCardinalDirection(135)).toBe('SE')
    expect(getCardinalDirection(180)).toBe('S')
    expect(getCardinalDirection(225)).toBe('SW')
    expect(getCardinalDirection(270)).toBe('W')
    expect(getCardinalDirection(315)).toBe('NW')
  })

  it('zawija się poprawnie blisko 360/0', () => {
    expect(getCardinalDirection(359)).toBe('N')
    expect(getCardinalDirection(1)).toBe('N')
  })
})

describe('formatDistance', () => {
  it('formatuje metry poniżej 1km', () => {
    expect(formatDistance(820)).toBe('820 m')
  })

  it('formatuje kilometry z jednym miejscem po przecinku', () => {
    expect(formatDistance(2350)).toBe('2.4 km')
  })
})
