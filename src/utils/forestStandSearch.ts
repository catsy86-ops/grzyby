import { normalizeTreeCode, siteTypeName, TREE_NAMES, type TreeCode } from '../data/forestCodes'
import type { Species, Spot } from '../db/schema'
import { getDistanceMeters } from './bearing'
import { formatStandAge } from './forestStand'

// "Gdzie szukać" (Faza 29, pkt 2) - wydzielenia leśne z danym gatunkiem panującym w promieniu od
// punktu. W odróżnieniu od forestStand.ts (WMS GetFeatureInfo w JEDNYM punkcie) to zapytanie
// przestrzenne do warstwy REST "Wydzielenia PGL LP" tego samego serwera BDL - CORS sprawdzony
// 2026-10-03 (Access-Control-Allow-Origin odbija origin strony).
const BDL_QUERY_URL = 'https://mapserver.bdl.lasy.gov.pl/ArcGIS/rest/services/WMS_BDL/MapServer/5/query'

export const DEFAULT_SEARCH_RADIUS_M = 3000
// Limit warstwy to 2000 rekordów - w promieniu 3 km wokół lasu wychodzi zwykle kilkaset.
const MAX_RECORDS = 2000

export interface MatchingStand {
  id: string
  treeCode: TreeCode
  treeName: string
  age: number | null
  siteType: string | null
  // Środek wydzielenia (średnia wierzchołków zewnętrznego pierścienia) - wystarczy jako punkt
  // docelowy nawigacji, wydzielenia mają zwykle kilka hektarów.
  latitude: number
  longitude: number
  distanceM: number
}

export interface StandSearchOptions {
  radiusM?: number
  // Filtr ustawiany przez użytkownika, nie rekomendacja - atlas nie podaje wieku drzewostanu dla
  // gatunków (zasada z Faz 25-26: nie dopowiadamy wiedzy mykologicznej, której nie ma w danych).
  minAge?: number
  signal?: AbortSignal
}

// Kody w BDL są dopełniane spacjami do 9 znaków i mają podgatunki po kropce ("DB.B", "DB.S"),
// stąd LIKE z prefiksem zamiast równości.
export function buildStandSearchUrl(lat: number, lon: number, trees: readonly TreeCode[], options: StandSearchOptions = {}): string {
  const treeClause = trees.map((code) => `species_cd_d LIKE '${code}%'`).join(' OR ')
  const where = options.minAge ? `(${treeClause}) AND species_age >= ${Math.floor(options.minAge)}` : treeClause
  const params = new URLSearchParams({
    where,
    geometry: `${lon},${lat}`,
    geometryType: 'esriGeometryPoint',
    inSR: '4326',
    spatialRel: 'esriSpatialRelIntersects',
    distance: String(options.radiusM ?? DEFAULT_SEARCH_RADIUS_M),
    units: 'esriSRUnit_Meter',
    outFields: 'species_cd_d,species_age,site_type_cd,adress_forest',
    returnGeometry: 'true',
    outSR: '4326',
    // ~20 m uproszczenia - geometria służy tylko do wyliczenia środka, nie do rysowania.
    maxAllowableOffset: '0.0002',
    resultRecordCount: String(MAX_RECORDS),
    f: 'geojson',
  })
  return `${BDL_QUERY_URL}?${params}`
}

type Position = [number, number]

interface StandFeature {
  geometry?: { type: string; coordinates: unknown } | null
  properties?: Record<string, string | number | null | undefined>
}

function outerRing(geometry: StandFeature['geometry']): Position[] | null {
  if (!geometry) return null
  if (geometry.type === 'Polygon') return (geometry.coordinates as Position[][])[0] ?? null
  if (geometry.type === 'MultiPolygon') {
    // Największa część (po liczbie wierzchołków - przybliżenie, wystarczy do punktu docelowego).
    const parts = (geometry.coordinates as Position[][][]).map((polygon) => polygon[0]).filter(Boolean)
    return parts.sort((a, b) => b.length - a.length)[0] ?? null
  }
  return null
}

function ringCenter(ring: Position[]): { latitude: number; longitude: number } | null {
  // Ostatni wierzchołek GeoJSON powtarza pierwszy - pomijamy go, żeby nie ważył podwójnie.
  const points = ring.length > 1 ? ring.slice(0, -1) : ring
  if (points.length === 0) return null
  const lon = points.reduce((sum, p) => sum + p[0], 0) / points.length
  const lat = points.reduce((sum, p) => sum + p[1], 0) / points.length
  return { latitude: lat, longitude: lon }
}

export function parseStandSearch(body: unknown, origin: { latitude: number; longitude: number }): MatchingStand[] {
  const features = (body as { features?: StandFeature[] } | null)?.features ?? []
  const stands: MatchingStand[] = []
  for (const feature of features) {
    const props = feature.properties ?? {}
    const treeCode = normalizeTreeCode(String(props.species_cd_d ?? ''))
    const ring = outerRing(feature.geometry)
    const center = ring ? ringCenter(ring) : null
    if (!treeCode || !center) continue
    const age = typeof props.species_age === 'number' && props.species_age > 0 ? props.species_age : null
    stands.push({
      id: String(props.adress_forest ?? '').replace(/\s+/g, ''),
      treeCode,
      treeName: TREE_NAMES[treeCode],
      age,
      siteType: siteTypeName(String(props.site_type_cd ?? '')),
      ...center,
      distanceM: getDistanceMeters([origin.latitude, origin.longitude], [center.latitude, center.longitude]),
    })
  }
  return stands.sort((a, b) => a.distanceM - b.distanceM)
}

export async function searchMatchingStands(
  lat: number,
  lon: number,
  trees: readonly TreeCode[],
  options: StandSearchOptions = {},
): Promise<MatchingStand[]> {
  if (trees.length === 0) return []
  const response = await fetch(buildStandSearchUrl(lat, lon, trees, options), { signal: options.signal })
  if (!response.ok) throw new Error(`BDL query: HTTP ${response.status}`)
  const body = (await response.json()) as { error?: unknown }
  // ArcGIS zwraca błędy zapytania jako HTTP 200 z polem `error`.
  if (body && typeof body === 'object' && 'error' in body) throw new Error('BDL query: błąd serwera')
  return parseStandSearch(body, { latitude: lat, longitude: lon })
}

// Wydzielenie zapisane jako grzybowisko - cel nawigacji w apce to zawsze grzybowisko.
export function buildStandSpot(stand: MatchingStand, species: Species, createdAt = Date.now()): Spot {
  return {
    name: `${stand.treeName}${stand.age ? ` ${formatStandAge(stand.age)}` : ''} - ${species.nameCommon}`,
    latitude: stand.latitude,
    longitude: stand.longitude,
    notes: `Z "Gdzie szukać" (BDL, wydzielenie ${stand.id}${stand.siteType ? `, ${stand.siteType}` : ''}).`,
    createdAt,
  }
}
