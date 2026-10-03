import { describe, expect, it } from 'vitest'
import {
  DEFAULT_MAP_LAYER_ID,
  getMapLayer,
  getMapOverlays,
  getOfflineMapLayer,
  isBaseMapTileRequest,
  isCacheableOverlayRequest,
  isLegacyOsmTileUrl,
  MAP_LAYERS,
  MAP_OVERLAYS,
  mapTileCacheKey,
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

  it('nakładki mają unikalny zIndex, szlaki (linie) rysowane nad plamami drzewostanów i obszarów', () => {
    const zIndexes = MAP_OVERLAYS.map((overlay) => overlay.zIndex)
    expect(new Set(zIndexes).size).toBe(zIndexes.length)
    const [forest, protectedAreas, trails] = getMapOverlays(['forest', 'protected', 'trails'])
    expect(trails.zIndex).toBeGreaterThan(forest.zIndex)
    expect(trails.zIndex).toBeGreaterThan(protectedAreas.zIndex)
    // Nad podkładem (z-index 1, MapTileLayers.tsx).
    expect(Math.min(...zIndexes)).toBeGreaterThan(1)
  })

  it('maxNativeZoom nigdy nie przekracza maxZoom; terenowa i szlaki przybliżają się do z19', () => {
    for (const def of [...MAP_LAYERS, ...MAP_OVERLAYS]) {
      if (def.maxNativeZoom !== undefined) expect(def.maxNativeZoom).toBeLessThanOrEqual(def.maxZoom)
    }
    expect(getMapLayer('topo')).toMatchObject({ maxZoom: 19, maxNativeZoom: 17 })
    expect(getMapOverlays(['trails'])[0]).toMatchObject({ maxZoom: 19, maxNativeZoom: 18 })
  })

  it('detectRetina tylko dla warstw WMS (dla kafli XYZ psułby czytelność i mnożył zapytania)', () => {
    for (const layer of MAP_LAYERS) {
      if (layer.detectRetina) expect(layer.wms).toBeDefined()
    }
    expect(getMapLayer('satellite').detectRetina).toBe(true)
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

  it('klucz cache kafli podkładu jest wspólny dla subdomen a/b/c', () => {
    const key = 'https://a.tile.opentopomap.org/16/36435/21024.png'
    expect(mapTileCacheKey(new URL('https://b.tile.opentopomap.org/16/36435/21024.png'))).toBe(key)
    expect(mapTileCacheKey(new URL('https://c.tile.opentopomap.org/16/36435/21024.png'))).toBe(key)
    expect(mapTileCacheKey(new URL(key))).toBe(key)
  })

  it('mapa standardowa używa jednego adresu OSM, bez subdomen a/b/c', () => {
    expect(getMapLayer('street').urlTemplate).toBe('https://tile.openstreetmap.org/{z}/{x}/{y}.png')
  })

  it('Service Worker zapisuje w cache kafle OSM i OpenTopoMap, ale nie ortofoto ani nakładek', () => {
    expect(isBaseMapTileRequest(new URL('https://tile.openstreetmap.org/14/1/2.png'))).toBe(true)
    expect(isBaseMapTileRequest(new URL('https://b.tile.opentopomap.org/14/1/2.png'))).toBe(true)
    expect(isBaseMapTileRequest(new URL(`${getMapLayer('satellite').urlTemplate}?REQUEST=GetMap`))).toBe(false)
    expect(isBaseMapTileRequest(new URL('https://tile.waymarkedtrails.org/hiking/14/1/2.png'))).toBe(false)
  })

  it('stare kafle OSM z subdomen a/b/c są rozpoznawane do usunięcia, nowe i OpenTopoMap nie', () => {
    expect(isLegacyOsmTileUrl(new URL('https://a.tile.openstreetmap.org/14/1/2.png'))).toBe(true)
    expect(isLegacyOsmTileUrl(new URL('https://c.tile.openstreetmap.org/14/1/2.png'))).toBe(true)
    expect(isLegacyOsmTileUrl(new URL('https://tile.openstreetmap.org/14/1/2.png'))).toBe(false)
    expect(isLegacyOsmTileUrl(new URL('https://a.tile.opentopomap.org/14/1/2.png'))).toBe(false)
  })

  it('klucz cache kafli nie zmienia adresów bez subdomeny a/b/c', () => {
    for (const href of ['https://tile.openstreetmap.org/14/1/2.png', 'https://tile.waymarkedtrails.org/hiking/14/1/2.png']) {
      expect(mapTileCacheKey(new URL(href))).toBe(href)
    }
  })

  it('klucz cache nakładek pomija parametr ponowienia kafla', () => {
    expect(overlayCacheKey(new URL('https://sdi.gdos.gov.pl/wms?bbox=1&retry=2'))).toBe('https://sdi.gdos.gov.pl/wms?bbox=1')
  })
})
