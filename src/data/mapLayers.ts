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
  id: 'street' | 'topo' | 'topoPl' | 'cyclosm' | 'satellite'
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
    id: 'topoPl',
    label: 'Topograficzna (GUGiK)',
    // Polska mapa topograficzna z Geoportalu: drogi leśne, przecinki, oddziały, bagna i lokalne nazwy,
    // których nie ma w OSM. Usługa sama zmienia skalę mapy - szczegółowa od ok. z15, przy z14 i niżej
    // pokazuje powiększoną mapę przeglądową. JPEG zamiast PNG - ok. 29 KB zamiast 132 KB na kafel
    // (pomiar 2026-10-03), przy mapie rastrowej bez przezroczystości.
    urlTemplate: 'https://mapy.geoportal.gov.pl/wss/service/img/guest/TOPO/MapServer/WMSServer',
    attribution: '&copy; <a href="https://www.geoportal.gov.pl">GUGiK</a>',
    maxZoom: 19,
    wms: { layers: 'Raster', format: 'image/jpeg', transparent: false },
    // GUGiK zabrania masowego pobierania - "Pobierz obszar offline" bierze wtedy mapę standardową.
    offline: false,
  },
  {
    id: 'cyclosm',
    label: 'Dukty i ścieżki (CyclOSM)',
    // Styl OSM, który wyraźnie rysuje drogi gruntowe, dukty leśne i ścieżki z rodzajem nawierzchni.
    urlTemplate: 'https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png',
    attribution:
      'Styl: <a href="https://www.cyclosm.org">CyclOSM</a> | Dane: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
    // Serwer społecznościowy (OSM France) - tylko przeglądanie, bez masowego pobierania.
    offline: false,
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
  id: 'forest' | 'relief' | 'protected' | 'bans' | 'fire' | 'trails'
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
  // Kolejność rysowania, niezależna od kolejności włączania: tło regionu (pożary 6) pod plamami
  // (drzewostany 10, obszary chronione 11, zakazy 12), te pod liniami (szlaki 15). Zarezerwowane:
  // rzeźba terenu 5 (Faza 30).
  zIndex: number
  // Jak Service Worker przechowuje obejrzane kafle: 'long' - CacheFirst 60 dni (dane zmieniają się
  // rzadko: drzewostany, obszary chronione, szlaki); 'short' - NetworkFirst, najwyżej 1 dzień (zakazy
  // wstępu, zagrożenie pożarowe - stary zakaz pokazany offline byłby błędną informacją); 'none' - bez
  // cache (usługi GUGiK zabraniają gromadzenia kafli).
  cache: 'long' | 'short' | 'none'
  // Kolory tak, jak rysuje je WMS (zmierzone z pikseli kafli - opis renderera w REST bywa inny niż obraz
  // WMS) - pod panel warstw i legendę na mapie.
  legend?: { color: string; label: string }[]
  // Mieszanie z podkładem zamiast zwykłego krycia - cieniowanie rzeźby (szare) ma przyciemniać mapę
  // pod spodem, a nie zakrywać jej kolorów (klasa CSS w MapTileLayers.tsx / index.css).
  blend?: 'multiply'
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
    id: 'relief',
    label: 'Rzeźba terenu',
    description: 'Cieniowanie z lotniczego skanowania laserowego - wąwozy, skarpy, mokradła i rowy pod drzewami',
    urlTemplate: 'https://mapy.geoportal.gov.pl/wss/service/PZGIK/NMT/GRID1/WMS/ShadedRelief',
    attribution: 'NMT &copy; <a href="https://www.geoportal.gov.pl">GUGiK</a>',
    minZoom: 11,
    maxZoom: 19,
    opacity: 0.45,
    zIndex: 5,
    // GUGiK zabrania gromadzenia kafli (jak ortofotomapa) - bez cache Service Workera.
    cache: 'none',
    blend: 'multiply',
    wms: { layers: 'Raster', format: 'image/png', transparent: true },
  },
  {
    id: 'protected',
    label: 'Obszary chronione',
    description:
      'Rezerwaty i parki narodowe (zbiór zakazany), użytki ekologiczne i zespoły przyrodniczo-krajobrazowe (zakazy w uchwale)',
    urlTemplate: 'https://sdi.gdos.gov.pl/wms',
    attribution: '&copy; <a href="https://www.gdos.gov.pl">GDOŚ</a>',
    minZoom: 9,
    maxZoom: 19,
    opacity: 0.45,
    zIndex: 11,
    cache: 'long',
    // Kolory zmierzone z pikseli GetMap każdej warstwy osobno (2026-10-03).
    legend: [
      { color: '#ff7f00', label: 'Rezerwat' },
      { color: '#4daf4b', label: 'Park narodowy' },
      { color: '#7bfc00', label: 'Użytek ekologiczny' },
      { color: '#e600a8', label: 'Zespół przyrodniczo-krajobrazowy' },
    ],
    // Użytki ekologiczne i zespoły przyrodniczo-krajobrazowe: zakazy (często także zbioru) zależą od uchwały
    // ustanawiającej. Bez Natury 2000 i parków krajobrazowych - tam zbiór grzybów jest dozwolony, więc
    // byłby to fałszywy alarm na większości lasów regionu.
    wms: {
      layers: 'GDOS:Rezerwaty,GDOS:ParkiNarodowe,GDOS:UzytkiEkologiczne,GDOS:ZespolyPrzyrodniczoKrajobrazowe',
      format: 'image/png',
      transparent: true,
    },
  },
  // Zakazy i pożary: usługi Lasów Państwowych na tym samym serwerze co drzewostany (sprawdzone
  // 2026-10-03: CORS odbija origin strony, w regionie 79 aktywnych zakazów, m.in. nadl. Gościno, Głusko).
  {
    id: 'bans',
    label: 'Zakazy wstępu',
    description: 'Okresowe zakazy wstępu do lasu (Lasy Państwowe), aktualizowane na bieżąco',
    urlTemplate: 'https://mapserver.bdl.lasy.gov.pl/ArcGIS/services/WMS_zakazy_wstepu_do_lasu/MapServer/WMSServer',
    attribution: '<a href="https://www.bdl.lasy.gov.pl">Bank Danych o Lasach</a>',
    // Od z10 widać cały region - zakaz trzeba zobaczyć przed wyjazdem, nie dopiero w lesie.
    minZoom: 10,
    maxZoom: 19,
    opacity: 0.6,
    zIndex: 12,
    cache: 'short',
    // WMS rysuje zakazy na żółto (#ffff4d, pomiar 2026-10-03), choć renderer REST opisuje czerwień.
    legend: [{ color: '#ffff4d', label: 'Okresowy zakaz wstępu' }],
    // WMS numeruje warstwy odwrotnie niż REST: 3 = zakazy (0-2 to granice leśnictw, nadleśnictw, RDLP).
    wms: { layers: '3', format: 'image/png', transparent: true },
  },
  {
    id: 'fire',
    label: 'Zagrożenie pożarowe',
    description: 'Strefy zagrożenia pożarowego lasów - prognoza Lasów Państwowych',
    urlTemplate: 'https://mapserver.bdl.lasy.gov.pl/ArcGIS/services/WMS_zagrozenie_pozarowe_w_lasach/MapServer/WMSServer',
    attribution: '<a href="https://www.bdl.lasy.gov.pl">Bank Danych o Lasach</a>',
    minZoom: 8,
    maxZoom: 19,
    // Strefy pokrywają cały region - niskie krycie i rysowanie POD drzewostanami i zakazami, żeby
    // zielone/żółte tło nie zmieniało ich kolorów.
    opacity: 0.35,
    zIndex: 6,
    cache: 'short',
    // WMS = kolor renderera REST rozjaśniony ~30% bielą. "Małe" i "brak" zmierzone z pikseli
    // 2026-10-03; "duże" i "średnie" wyliczone tym samym przekształceniem (nie występowały w regionie).
    legend: [
      { color: '#ff4d4d', label: 'Duże' },
      { color: '#ffff4d', label: 'Średnie' },
      { color: '#88ff4d', label: 'Małe' },
      { color: '#4d9bff', label: 'Brak zagrożenia' },
    ],
    wms: { layers: '0', format: 'image/png', transparent: true },
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
