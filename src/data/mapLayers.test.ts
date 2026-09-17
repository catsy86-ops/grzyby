import { describe, expect, it } from 'vitest'
import { DEFAULT_MAP_LAYER_ID, getMapLayer, MAP_LAYERS } from './mapLayers'

describe('mapLayers', () => {
  it('zawiera unikalne id dla każdej warstwy', () => {
    const ids = MAP_LAYERS.map((layer) => layer.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('domyślna warstwa istnieje na liście', () => {
    expect(MAP_LAYERS.some((layer) => layer.id === DEFAULT_MAP_LAYER_ID)).toBe(true)
  })

  it('getMapLayer zwraca warstwę po id', () => {
    expect(getMapLayer('topo').label).toBe('Terenowa')
  })

  it('getMapLayer wraca do pierwszej warstwy dla nieznanego id', () => {
    // @ts-expect-error - testujemy zachowanie na nieprawidłowym wejściu (np. dane z localStorage
    // po usunięciu warstwy w przyszłej wersji).
    expect(getMapLayer('nieznana')).toBe(MAP_LAYERS[0])
  })
})
