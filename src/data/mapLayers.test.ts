import { describe, expect, it } from 'vitest'
import {
  DEFAULT_MAP_LAYER_ID,
  getMapLayer,
  getMapOverlays,
  getOfflineMapLayer,
  isCacheableOverlayRequest,
  MAP_LAYERS,
  MAP_OVERLAYS,
  overlayCacheKey,
} from './mapLayers'

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

  it('cache nakładek obejmuje kafle BDL/GDOŚ/szlaków, ale nie ortofotomapę ani GetFeatureInfo', () => {
    const bdl = 'https://mapserver.bdl.lasy.gov.pl/ArcGIS/services/WMS_BDL/mapserver/WMSServer'
    expect(isCacheableOverlayRequest(new URL(`${bdl}?REQUEST=GetMap&BBOX=1,2,3,4`))).toBe(true)
    expect(isCacheableOverlayRequest(new URL('https://tile.waymarkedtrails.org/hiking/13/1/2.png'))).toBe(true)
    expect(isCacheableOverlayRequest(new URL('https://sdi.gdos.gov.pl/wms?REQUEST=GetMap'))).toBe(true)
    expect(isCacheableOverlayRequest(new URL(`${bdl}?REQUEST=GetFeatureInfo`))).toBe(false)
    expect(isCacheableOverlayRequest(new URL(`${getMapLayer('satellite').urlTemplate}?REQUEST=GetMap`))).toBe(false)
  })

  it('klucz cache nakładek pomija parametr ponowienia kafla', () => {
    expect(overlayCacheKey(new URL('https://sdi.gdos.gov.pl/wms?bbox=1&retry=2'))).toBe('https://sdi.gdos.gov.pl/wms?bbox=1')
  })
})
