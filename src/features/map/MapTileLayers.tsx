import type { LeafletEventHandlerFnMap } from 'leaflet'
import { useMemo } from 'react'
import { TileLayer, WMSTileLayer } from 'react-leaflet'
import type { MapLayerDef, MapOverlayDef } from '../../data/mapLayers'
import { retryWmsTile } from '../../utils/wmsTileRetry'

// Wspólny render podkładu i nakładek - warstwa WMS (ortofotomapa, Bank Danych o Lasach, GDOŚ)
// albo zwykłe kafle {z}/{x}/{y}. `def.wms` to stała z data/mapLayers.ts, więc referencja `params`
// jest stabilna między renderami - inaczej react-leaflet wołałby `setParams` (i przeładowywał
// wszystkie kafle) przy każdym ticku GPS, który re-renderuje MapView.
export function MapTileLayer({
  def,
  eventHandlers,
}: {
  def: MapLayerDef | MapOverlayDef
  eventHandlers?: LeafletEventHandlerFnMap
}) {
  const overlay = 'opacity' in def ? def : null
  const isWms = def.wms !== undefined
  const handlers = useMemo<LeafletEventHandlerFnMap | undefined>(() => {
    if (!isWms) return eventHandlers
    return {
      ...eventHandlers,
      tileerror: (event) => {
        eventHandlers?.tileerror?.(event)
        retryWmsTile(event)
      },
    }
  }, [isWms, eventHandlers])

  const common = {
    // Klasa na kontenerze warstwy (opcja Leafleta) - filtry kolorów z index.css działają tylko na
    // podkładach; nakładki (BDL, GDOŚ) muszą zachować kolory zgodne z legendą serwera. Ustawiana
    // przy tworzeniu warstwy, co wystarcza, bo warstwy w MapView mają `key` po id.
    className: overlay
      ? `map-overlay map-overlay--${def.id}${overlay.blend ? ` map-overlay--blend-${overlay.blend}` : ''}`
      : `map-layer map-layer--${def.id}`,
    attribution: def.attribution,
    maxZoom: def.maxZoom,
    maxNativeZoom: def.maxNativeZoom,
    detectRetina: 'detectRetina' in def ? def.detectRetina : undefined,
    minZoom: overlay?.minZoom,
    opacity: overlay?.opacity,
    // Nakładki nad podkładem i pod markerami (tilePane ma z-index 200, markery 600), między sobą według
    // `zIndex` z data/mapLayers.ts (plamy pod liniami). Podkład MUSI mieć
    // własny z-index (1, domyślny w Leaflecie) - z `undefined` jego kontener nie tworzył osobnego
    // kontekstu warstw i wewnętrzny kontener kafli (z-index = maxZoom, np. 19) przykrywał nakładkę
    // (z-index >= 10). Do 2026-10-03 maskował to filtr kolorów; wyszło na ortofoto w jasnym motywie.
    zIndex: overlay ? overlay.zIndex : 1,
    // Serwery nakładek wysyłają CORS - dzięki temu Service Worker cache'uje zwykłe odpowiedzi 200
    // zamiast nieprzezroczystych (patrz sw.ts, cache 'map-overlays').
    crossOrigin: overlay ? ('anonymous' as const) : undefined,
    eventHandlers: handlers,
  }

  if (def.wms) {
    // Kafle 512px dla nakładek: o połowę mniej zapytań do wolnych serwerów WMS i mniej ucinanych
    // na krawędziach kafli etykiet (numery wydzieleń leśnych, nazwy rezerwatów).
    return <WMSTileLayer url={def.urlTemplate} params={def.wms} tileSize={overlay ? 512 : 256} {...common} />
  }
  return <TileLayer url={def.urlTemplate} {...common} />
}
