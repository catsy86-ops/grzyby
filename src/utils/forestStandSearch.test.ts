import { describe, expect, it } from 'vitest'
import type { Species } from '../db/schema'
import { buildStandSearchUrl, buildStandSpot, parseStandSearch } from './forestStandSearch'

const ORIGIN = { latitude: 53.35, longitude: 14.65 }

function square(lon: number, lat: number, d = 0.001) {
  return [
    [lon, lat],
    [lon + d, lat],
    [lon + d, lat + d],
    [lon, lat + d],
    [lon, lat],
  ]
}

describe('buildStandSearchUrl', () => {
  it('szuka po prefiksie kodu drzewa w promieniu od punktu, z opcjonalnym minimalnym wiekiem', () => {
    const url = new URL(buildStandSearchUrl(53.35, 14.65, ['BK', 'DB'], { minAge: 80, radiusM: 2000 }))
    expect(url.searchParams.get('where')).toBe("(species_cd_d LIKE 'BK%' OR species_cd_d LIKE 'DB%') AND species_age >= 80")
    expect(url.searchParams.get('geometry')).toBe('14.65,53.35')
    expect(url.searchParams.get('distance')).toBe('2000')
    expect(url.searchParams.get('f')).toBe('geojson')
  })

  it('bez filtra wieku nie dokleja warunku na wiek', () => {
    const url = new URL(buildStandSearchUrl(53.35, 14.65, ['SO']))
    expect(url.searchParams.get('where')).toBe("species_cd_d LIKE 'SO%'")
  })
})

describe('parseStandSearch', () => {
  it('normalizuje kody BDL (spacje, podgatunki), liczy środek i sortuje od najbliższego', () => {
    const stands = parseStandSearch(
      {
        features: [
          {
            geometry: { type: 'Polygon', coordinates: [square(14.70, 53.35)] },
            properties: { species_cd_d: 'BK       ', species_age: 121, site_type_cd: 'LŚW    ', adress_forest: '10-12-2-08-300   -b   -00' },
          },
          {
            geometry: { type: 'MultiPolygon', coordinates: [[square(14.651, 53.351)]] },
            properties: { species_cd_d: 'DB.B     ', species_age: 0, site_type_cd: null, adress_forest: '10-12-2-08-301   -a   -00' },
          },
          // Bez gatunku panującego (np. powierzchnia niezalesiona) - pomijane.
          { geometry: { type: 'Polygon', coordinates: [square(14.65, 53.35)] }, properties: { species_cd_d: null } },
        ],
      },
      ORIGIN,
    )

    expect(stands.map((s) => s.treeCode)).toEqual(['DB', 'BK'])
    expect(stands[0]).toMatchObject({ treeName: 'Dąb', age: null, siteType: null, id: '10-12-2-08-301-a-00' })
    expect(stands[0].latitude).toBeCloseTo(53.3515, 4)
    expect(stands[1]).toMatchObject({ age: 121, siteType: 'las świeży' })
    expect(stands[0].distanceM).toBeLessThan(stands[1].distanceM)
  })

  it('zwraca pustą listę dla odpowiedzi bez features', () => {
    expect(parseStandSearch({}, ORIGIN)).toEqual([])
    expect(parseStandSearch(null, ORIGIN)).toEqual([])
  })
})

describe('buildStandSpot', () => {
  it('nazywa grzybowisko drzewem, wiekiem i gatunkiem, a w notatce zostawia numer wydzielenia', () => {
    const spot = buildStandSpot(
      { id: '10-12-2-08-300-b-00', treeCode: 'BK', treeName: 'Buk', age: 121, siteType: 'las świeży', latitude: 1, longitude: 2, distanceM: 10 },
      { nameCommon: 'Borowik szlachetny' } as Species,
      123,
    )
    expect(spot).toEqual({
      name: 'Buk 121 lat - Borowik szlachetny',
      latitude: 1,
      longitude: 2,
      notes: 'Z "Gdzie szukać" (BDL, wydzielenie 10-12-2-08-300-b-00, las świeży).',
      createdAt: 123,
    })
  })
})
