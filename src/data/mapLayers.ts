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
  // Najwyższy poziom, na którym serwer ma własne kafle - powyżej Leaflet powiększa kafle z tego poziomu
  // zamiast blokować przybliżanie całej mapy (brak = taki sam jak maxZoom).
  maxNativeZoom?: number
  // Dla ekranów o gęstości > 1 prosi o obraz 2x większy (tylko WMS - dla kafli XYZ Leaflet przesuwa
  // poziomy zoomu, co dla OSM daje drobny, nieczytelny tekst i 4x więcej kafli).
  detectRetina?: boolean
  wms?: WmsParams
  // Czy "Pobierz obszar offline" może pobierać kafle tej warstwy - patrz OfflineAreaDownload.tsx.
  offline: boolean
}

export const MAP_LAYERS: MapLayerDef[] = [
  {
    id: 'street',
    label: 'Standardowa',
    // Bez subdomen a/b/c - OSM zaleca jeden adres (HTTP/2), patrz zasady korzystania z kafli
    // (operations.osmfoundation.org/policies/tiles). Zmiana 2026-10-03, Faza 30 krok 2.
    urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
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
    // Serwer OpenTopoMap ma kafle tylko do z17 - wyżej Leaflet powiększa kafle z17, zamiast (jak do
    // 2026-10-03) blokować przybliżanie całej mapy po przełączeniu na widok terenowy.
    maxZoom: 19,
    maxNativeZoom: 17,
    offline: true,
  },
  {
    id: 'satellite',
    label: 'Satelitarna',
    urlTemplate: 'https://mapy.geoportal.gov.pl/wss/service/PZGIK/ORTO/WMS/StandardResolution',
    attribution: 'Ortofotomapa &copy; <a href="https://www.geoportal.gov.pl">GUGiK</a>',
    maxZoom: 19,
    // Zdjęcia lotnicze na telefonie (gęstość ekranu 2-3) były wyraźnie rozmyte - obraz 512 px na
    // kafel 256 px.
    detectRetina: true,
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

// Leaflet rozkłada kafle `{s}` na subdomeny a/b/c według (x + y) % 3, więc ten sam kafel ma trzy
// adresy (dziś dotyczy to OpenTopoMap - OSM ma jeden adres). "Pobierz obszar offline" zapisuje każdy
// kafel pod "a", a Service Worker (trasa 'map-tiles' w sw.ts) szukał po dokładnym adresie - offline
// trafiała tylko ok. 1/3 pobranych kafli (pomiar 2026-10-03: na z16 13 z 20 widocznych kafli szło do
// sieci mimo pobranego obszaru). Wspólny klucz dla obu miejsc.
export function mapTileCacheKey(url: URL): string {
  return url.href.replace(/^https:\/\/[abc]\.tile\./, 'https://a.tile.')
}

// Kafle podkładów, które Service Worker cache'uje w 'map-tiles' (te same, które wolno pobrać przez
// "Pobierz obszar offline" - `offline: true` w MAP_LAYERS).
export function isBaseMapTileRequest(url: URL): boolean {
  return url.host === 'tile.openstreetmap.org' || /^[abc]\.tile\.opentopomap\.org$/.test(url.host)
}

// Kafle OSM sprzed zmiany adresu na tile.openstreetmap.org - żadne zapytanie już ich nie trafi,
// więc Service Worker usuwa je przy aktywacji, żeby nie zajmowały miejsca.
export function isLegacyOsmTileUrl(url: URL): boolean {
  return /^[abc]\.tile\.openstreetmap\.org$/.test(url.host)
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
  maxNativeZoom?: number
  opacity: number
  // Kolejność rysowania: plamy (drzewostany, obszary) pod liniami (szlaki), niezależnie od kolejności
  // włączania. Zarezerwowane na przyszłe nakładki (Faza 30): rzeźba 5, zakazy 12, pożary 13.
  zIndex: number
  // Jak Service Worker przechowuje obejrzane kafle: 'long' - CacheFirst 60 dni (dane zmieniają się
  // rzadko: drzewostany, obszary chronione, szlaki); 'short' - NetworkFirst, najwyżej 1 dzień (zakazy
  // wstępu, zagrożenie pożarowe - stary zakaz pokazany offline byłby błędną informacją); 'none' - bez
  // cache (usługi GUGiK zabraniają gromadzenia kafli).
  cache: 'long' | 'short' | 'none'
  wms?: WmsParams
}

export const MAP_OVERLAYS: MapOverlayDef[] = [
  {
    id: 'forest',
    label: 'Drzewostany',
    // Kody z Banku Danych o Lasach: gatunek panujący + wiek, np. "SO80" = sosna, 80 lat.
    description: 'Dotknij lasu: gatunek i wiek drzew oraz grzyby z atlasu typowe dla nich',
    urlTemplate: 'https://mapserver.bdl.lasy.gov.pl/ArcGIS/services/WMS_BDL/mapserver/WMSServer',
    attribution: '<a href="https://www.bdl.lasy.gov.pl">Bank Danych o Lasach</a>',
    minZoom: 14,
    maxZoom: 19,
    opacity: 0.85,
    zIndex: 10,
    cache: 'long',
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
    zIndex: 11,
    cache: 'long',
    wms: { layers: 'GDOS:Rezerwaty,GDOS:ParkiNarodowe', format: 'image/png', transparent: true },
  },
  {
    id: 'trails',
    label: 'Szlaki piesze',
    description: 'Oznakowane szlaki turystyczne',
    urlTemplate: 'https://tile.waymarkedtrails.org/hiking/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://hiking.waymarkedtrails.org">Waymarked Trails</a> (CC-BY-SA)',
    minZoom: 9,
    // Waymarked Trails ma kafle do z18 - wyżej powiększone, żeby szlak nie znikał przy z19.
    maxZoom: 19,
    maxNativeZoom: 18,
    opacity: 0.9,
    zIndex: 15,
    cache: 'long',
  },
]

export type MapOverlayId = MapOverlayDef['id']

// Nieznane id (np. z localStorage po usunięciu nakładki w przyszłej wersji) są pomijane, a
// kolejność listy odpowiada MAP_OVERLAYS. Kolejność RYSOWANIA wyznacza `zIndex` każdej nakładki.
export function getMapOverlays(ids: readonly MapOverlayId[]): MapOverlayDef[] {
  return MAP_OVERLAYS.filter((overlay) => ids.includes(overlay.id))
}

// Kafle nakładek oglądane online zostają w Cache Storage (patrz sw.ts), żeby w lesie bez zasięgu
// nadal było widać drzewostany/szlaki tam, gdzie się już wcześniej patrzyło. To zwykłe
// zapamiętywanie obejrzanego, nie masowe pobieranie - "Pobierz obszar offline" nakładek nie
// pobiera. Ortofotomapa GUGiK celowo poza tym cache'em (regulamin zabrania gromadzenia kafli).
export const MAP_OVERLAYS_CACHE_NAME = 'map-overlays'
export const MAP_OVERLAYS_SHORT_CACHE_NAME = 'map-overlays-short'

export type OverlayCachePolicy = 'long' | 'short'

// Rozpoznanie nakładki po PREFIKSIE usługi, nie po hoście: drzewostany, zakazy wstępu i zagrożenie
// pożarowe są na tym samym serwerze BDL, a mają różne polityki cache. Dla kafli XYZ prefiks to szablon
// do pierwszego "{", dla WMS adres usługi + "?" (Leaflet dokleja tylko parametry zapytania).
const overlayPrefixes = MAP_OVERLAYS.map((overlay) => ({
  overlay,
  prefix: overlay.wms ? `${overlay.urlTemplate}?` : overlay.urlTemplate.split('{')[0],
}))

export function getOverlayCachePolicy(url: URL): OverlayCachePolicy | null {
  // Zapytania o atrybuty wydzielenia (karta "co tu rośnie") muszą być zawsze świeże.
  if (url.searchParams.get('REQUEST') === 'GetFeatureInfo') return null
  const overlay = overlayPrefixes.find(({ prefix }) => url.href.startsWith(prefix))?.overlay
  return overlay && overlay.cache !== 'none' ? overlay.cache : null
}

// Ponowienia kafli WMS (utils/wmsTileRetry.ts) dopisują `retry=N` - to ten sam obraz, więc klucz
// cache'a jest bez tego parametru.
export function overlayCacheKey(url: URL): string {
  const key = new URL(url.href)
  key.searchParams.delete('retry')
  return key.href
}
