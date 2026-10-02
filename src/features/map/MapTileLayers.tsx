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
    attribution: def.attribution,
    maxZoom: def.maxZoom,
    minZoom: overlay?.minZoom,
    opacity: overlay?.opacity,
    // Nakładki nad podkładem i pod markerami (tilePane ma z-index 200, markery 600).
    zIndex: overlay ? 10 : undefined,
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
