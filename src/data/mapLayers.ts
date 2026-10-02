// Warianty podkładu mapy - obok domyślnej mapy drogowej (OSM), widok topograficzny realnie
// pomaga ocenić zalesienie/ukształtowanie terenu z góry przed wyjściem w las (patrz
// docs/MAP-ROADMAP.md, Część 1 pkt 7). Zdjęcia lotnicze bierzemy z ortofotomapy GUGiK
// (Geoportal, usługa publiczna bez opłat) zamiast Esri World Imagery - Esri ma niejasne
// ograniczenia licencyjne dla tego typu użycia, GUGiK zabrania jedynie masowego pobierania
// (harvestingu), stąd `offline: false`.

// Warstwa serwowana przez WMS zamiast gotowych kafli {z}/{x}/{y} - wtedy `urlTemplate` to adres
// usługi, a Leaflet sam składa zapytania GetMap w EPSG:3857 (wszystkie użyte serwery go wspierają).
export interface WmsParams {
  layers: string
  format: 'image/png' | 'image/jpeg'
  transparent: boolean
}

export interface MapLayerDef {
  id: 'street' | 'topo' | 'satellite'
  label: string
  urlTemplate: string
  attribution: string
  maxZoom: number
  wms?: WmsParams
  // Czy "Pobierz obszar offline" może pobierać kafle tej warstwy - patrz OfflineAreaDownload.tsx.
  offline: boolean
}

export const MAP_LAYERS: MapLayerDef[] = [
  {
    id: 'street',
    label: 'Standardowa',
    urlTemplate: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
    offline: true,
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
    offline: true,
  },
  {
    id: 'satellite',
    label: 'Satelitarna',
    urlTemplate: 'https://mapy.geoportal.gov.pl/wss/service/PZGIK/ORTO/WMS/StandardResolution',
    attribution: 'Ortofotomapa &copy; <a href="https://www.geoportal.gov.pl">GUGiK</a>',
    maxZoom: 19,
    wms: { layers: 'Raster', format: 'image/jpeg', transparent: false },
    offline: false,
  },
]

export type MapLayerId = MapLayerDef['id']

export const DEFAULT_MAP_LAYER_ID: MapLayerId = 'street'

const mapLayersById = new Map(MAP_LAYERS.map((layer) => [layer.id, layer]))

export function getMapLayer(id: MapLayerId): MapLayerDef {
  return mapLayersById.get(id) ?? MAP_LAYERS[0]
}

// Warstwa, z której "Pobierz obszar offline" faktycznie pobierze kafle - dla warstw bez zgody na
// masowe pobieranie wracamy do standardowej mapy zamiast odmawiać pobrania w ogóle.
export function getOfflineMapLayer(id: MapLayerId): MapLayerDef {
  const layer = getMapLayer(id)
  return layer.offline ? layer : MAP_LAYERS[0]
}

// Nakładki - półprzezroczyste warstwy nad dowolnym podkładem, włączane niezależnie od siebie.
export interface MapOverlayDef {
  id: 'forest' | 'protected' | 'trails'
  label: string
  description: string
  urlTemplate: string
  attribution: string
  // Poniżej tego przybliżenia nakładka nic nie wnosi (np. numery wydzieleń leśnych zlewają się
  // w nieczytelną plamę), więc Leaflet nawet nie wysyła zapytań.
  minZoom: number
  maxZoom: number
  opacity: number
  wms?: WmsParams
}

export const MAP_OVERLAYS: MapOverlayDef[] = [
  {
    id: 'forest',
    label: 'Drzewostany',
    // Kody z Banku Danych o Lasach: gatunek panujący + wiek, np. "SO80" = sosna, 80 lat.
    description: 'Po przybliżeniu: SO80 = sosna 80 lat (ŚW świerk, BK buk, DB dąb, BRZ brzoza)',
    urlTemplate: 'https://mapserver.bdl.lasy.gov.pl/ArcGIS/services/WMS_BDL/mapserver/WMSServer',
    attribution: '<a href="https://www.bdl.lasy.gov.pl">Bank Danych o Lasach</a>',
    minZoom: 14,
    maxZoom: 19,
    opacity: 0.85,
    // 1 = wydzielenia (Lasy Państwowe), 0 = wydzielenia poza LP, 3 = granice oddziałów.
    wms: { layers: '0,1,3', format: 'image/png', transparent: true },
  },
  {
    id: 'protected',
    label: 'Obszary chronione',
    description: 'Rezerwaty i parki narodowe - zbieranie grzybów zakazane',
    urlTemplate: 'https://sdi.gdos.gov.pl/wms',
    attribution: '&copy; <a href="https://www.gdos.gov.pl">GDOŚ</a>',
    minZoom: 9,
    maxZoom: 19,
    opacity: 0.45,
    wms: { layers: 'GDOS:Rezerwaty,GDOS:ParkiNarodowe', format: 'image/png', transparent: true },
  },
  {
    id: 'trails',
    label: 'Szlaki piesze',
    description: 'Oznakowane szlaki turystyczne',
    urlTemplate: 'https://tile.waymarkedtrails.org/hiking/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://hiking.waymarkedtrails.org">Waymarked Trails</a> (CC-BY-SA)',
    minZoom: 9,
    maxZoom: 18,
    opacity: 0.9,
  },
]

export type MapOverlayId = MapOverlayDef['id']

// Nieznane id (np. z localStorage po usunięciu nakładki w przyszłej wersji) są pomijane, a
// kolejność zawsze odpowiada MAP_OVERLAYS - niezależnie od kolejności włączania.
export function getMapOverlays(ids: readonly MapOverlayId[]): MapOverlayDef[] {
  return MAP_OVERLAYS.filter((overlay) => ids.includes(overlay.id))
}
