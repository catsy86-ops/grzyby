import { getMapOverlays } from '../data/mapLayers'
import { normalizeTreeCode, siteTypeName, TREE_NAMES, type TreeCode } from '../data/forestCodes'

export interface ForestStand {
  treeCode: TreeCode | null
  // Surowy kod z BDL - pokazywany, gdy gatunku nie ma w słowniku TREE_NAMES.
  treeCodeRaw: string
  treeName: string
  age: number | null
  siteType: string | null
  areaHa: number | null
}

const BDL_URL = getMapOverlays(['forest'])[0].urlTemplate

// GetFeatureInfo potrzebuje "obrazka", na którym wskazujemy piksel - budujemy minimalny, 21x21 px
// wokół punktu (ok. 1 m na piksel w EPSG:3857), i pytamy o środkowy piksel.
const HALF_SIZE_M = 10
const SIZE_PX = 21

function toWebMercator(lat: number, lon: number): [number, number] {
  const x = (lon * 20037508.34) / 180
  const y = (Math.log(Math.tan(((90 + lat) * Math.PI) / 360)) * 20037508.34) / Math.PI
  return [x, y]
}

export function buildForestStandUrl(lat: number, lon: number): string {
  const [x, y] = toWebMercator(lat, lon)
  const params = new URLSearchParams({
    SERVICE: 'WMS',
    VERSION: '1.1.1',
    REQUEST: 'GetFeatureInfo',
    SRS: 'EPSG:3857',
    BBOX: [x - HALF_SIZE_M, y - HALF_SIZE_M, x + HALF_SIZE_M, y + HALF_SIZE_M].join(','),
    WIDTH: String(SIZE_PX),
    HEIGHT: String(SIZE_PX),
    // 1 = wydzielenia Lasów Państwowych, 0 = lasy poza LP (wg planów urządzenia lasu).
    LAYERS: '1,0',
    QUERY_LAYERS: '1,0',
    X: String((SIZE_PX - 1) / 2),
    Y: String((SIZE_PX - 1) / 2),
    INFO_FORMAT: 'application/geo+json',
    FEATURE_COUNT: '1',
    STYLES: '',
  })
  return `${BDL_URL}?${params}`
}

function parseNumber(raw: string | undefined): number | null {
  if (!raw) return null
  const value = Number(raw.trim().replace(',', '.'))
  return Number.isFinite(value) && value > 0 ? value : null
}

type StandFields = Record<string, string | undefined>

// Ten sam serwer ArcGIS na INFO_FORMAT=application/geo+json odpowiada raz GeoJSON-em, a raz
// (zależnie od węzła za load balancerem) XML-em z atrybutami w <FIELDS> - obsługujemy oba.
function readFields(body: string): StandFields | null {
  const trimmed = body.trim()
  if (trimmed.startsWith('{')) {
    const json = JSON.parse(trimmed) as { features?: { properties?: StandFields }[] }
    return json.features?.[0]?.properties ?? null
  }
  const element = new DOMParser().parseFromString(trimmed, 'text/xml').getElementsByTagName('FIELDS')[0]
  if (!element) return null
  return Object.fromEntries(Array.from(element.attributes, (attr) => [attr.name, attr.value]))
}

// Zwraca null, gdy w punkcie nie ma wydzielenia leśnego (pole, miasto, woda) albo wydzielenie
// nie ma gatunku panującego (np. powierzchnia niezalesiona, droga leśna).
export function parseForestStand(body: string): ForestStand | null {
  const fields = readFields(body)
  const treeCodeRaw = fields?.species_cd_d?.trim()
  if (!fields || !treeCodeRaw || treeCodeRaw === 'Null') return null
  const treeCode = normalizeTreeCode(treeCodeRaw)
  return {
    treeCode,
    treeCodeRaw,
    treeName: treeCode ? TREE_NAMES[treeCode] : treeCodeRaw,
    age: parseNumber(fields.species_age),
    siteType: siteTypeName(fields.site_type_cd ?? ''),
    areaHa: parseNumber(fields.sub_area),
  }
}

export async function fetchForestStand(lat: number, lon: number, signal?: AbortSignal): Promise<ForestStand | null> {
  const response = await fetch(buildForestStandUrl(lat, lon), { signal })
  if (!response.ok) throw new Error(`BDL GetFeatureInfo: HTTP ${response.status}`)
  return parseForestStand(await response.text())
}

// "1 rok", "23 lata", "12 lat", "136 lat" - polska odmiana liczebnika.
export function formatStandAge(age: number): string {
  if (age === 1) return '1 rok'
  const lastDigit = age % 10
  const lastTwo = age % 100
  return lastDigit >= 2 && lastDigit <= 4 && (lastTwo < 12 || lastTwo > 14) ? `${age} lata` : `${age} lat`
}
