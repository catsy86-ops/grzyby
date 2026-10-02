import { describe, expect, it } from 'vitest'
import { DEFAULT_MAP_LAYER_ID, getMapLayer, getMapOverlays, getOfflineMapLayer, MAP_LAYERS, MAP_OVERLAYS } from './mapLayers'

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

  it('getOfflineMapLayer zwraca warstwę, gdy wolno ją pobierać offline', () => {
    expect(getOfflineMapLayer('topo').id).toBe('topo')
  })

  it('getOfflineMapLayer wraca do standardowej mapy dla ortofotomapy (zakaz harvestingu GUGiK)', () => {
    expect(getMapLayer('satellite').offline).toBe(false)
    expect(getOfflineMapLayer('satellite').id).toBe('street')
  })

  it('nakładki mają unikalne id', () => {
    const ids = MAP_OVERLAYS.map((overlay) => overlay.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('getMapOverlays zachowuje kolejność MAP_OVERLAYS i pomija nieznane id', () => {
    // @ts-expect-error - nieznane id, np. z localStorage po usunięciu nakładki.
    expect(getMapOverlays(['trails', 'nieznana', 'forest']).map((overlay) => overlay.id)).toEqual(['forest', 'trails'])
  })
})
