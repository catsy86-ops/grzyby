// Warianty podkładu mapy - obok domyślnej mapy drogowej (OSM), widok topograficzny realnie
// pomaga ocenić zalesienie/ukształtowanie terenu z góry przed wyjściem w las (patrz
// docs/MAP-ROADMAP.md, Część 1 pkt 7). Satelitarne kafle świadomie pominięte - darmowe źródła
// (np. Esri World Imagery) mają niejasne ograniczenia licencyjne dla tego typu użycia, których
// nie chcemy zgadywać.
export interface MapLayerDef {
  id: 'street' | 'topo'
  label: string
  urlTemplate: string
  attribution: string
  maxZoom: number
}

export const MAP_LAYERS: MapLayerDef[] = [
  {
    id: 'street',
    label: 'Standardowa',
    urlTemplate: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
  {
    id: 'topo',
    label: 'Terenowa',
    urlTemplate: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution:
      '&copy; OpenStreetMap contributors, SRTM | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)',
    // Serwer OpenTopoMap wspiera kafle tylko do z17 (w odróżnieniu od z19 dla standardowej mapy
    // OSM) - powyżej tego poziomu kafle po prostu nie istnieją.
    maxZoom: 17,
  },
]

export type MapLayerId = MapLayerDef['id']

export const DEFAULT_MAP_LAYER_ID: MapLayerId = 'street'

const mapLayersById = new Map(MAP_LAYERS.map((layer) => [layer.id, layer]))

export function getMapLayer(id: MapLayerId): MapLayerDef {
  return mapLayersById.get(id) ?? MAP_LAYERS[0]
}
