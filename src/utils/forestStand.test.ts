import { describe, expect, it } from 'vitest'
import { buildForestStandUrl, formatStandAge, parseForestStand } from './forestStand'

const GEOJSON = JSON.stringify({
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: null,
      properties: { site_type_cd: 'BŚW    ', sub_area: '7,52', species_cd_d: 'SO       ', species_age: '97' },
    },
  ],
})

const XML = `<?xml version="1.0" encoding="UTF-8"?>
<FeatureInfoResponse xmlns="http://www.esri.com/wms">
<FIELDS site_type_cd="LŚW    " sub_area="3,55" species_cd_d="BK       " species_age="181"></FIELDS>
</FeatureInfoResponse>`

describe('forestStand', () => {
  it('buduje zapytanie GetFeatureInfo o środkowy piksel w EPSG:3857', () => {
    const url = new URL(buildForestStandUrl(53.36, 14.66))
    expect(url.searchParams.get('REQUEST')).toBe('GetFeatureInfo')
    expect(url.searchParams.get('SRS')).toBe('EPSG:3857')
    expect(url.searchParams.get('X')).toBe('10')
    const [minX, , maxX] = url.searchParams.get('BBOX')!.split(',').map(Number)
    expect(maxX - minX).toBeCloseTo(20)
  })

  it('parsuje odpowiedź GeoJSON', () => {
    expect(parseForestStand(GEOJSON)).toEqual({
      treeCode: 'SO',
      treeCodeRaw: 'SO',
      treeName: 'Sosna',
      age: 97,
      siteType: 'bór świeży',
      areaHa: 7.52,
    })
  })

  it('parsuje odpowiedź XML (inny węzeł tego samego serwera)', () => {
    expect(parseForestStand(XML)).toMatchObject({ treeName: 'Buk', age: 181, siteType: 'las świeży', areaHa: 3.55 })
  })

  it('zwraca null poza lasem albo bez gatunku panującego', () => {
    expect(parseForestStand('{ "type": "FeatureCollection", "features": [ ] }')).toBeNull()
    expect(parseForestStand('<FeatureInfoResponse xmlns="http://www.esri.com/wms"></FeatureInfoResponse>')).toBeNull()
    expect(parseForestStand(GEOJSON.replace('SO       ', 'Null'))).toBeNull()
  })

  it('pokazuje surowy kod dla gatunku spoza słownika', () => {
    expect(parseForestStand(GEOJSON.replace('SO       ', 'CZR'))).toMatchObject({ treeCode: null, treeName: 'CZR' })
  })

  it('odmienia wiek drzewostanu', () => {
    expect(formatStandAge(1)).toBe('1 rok')
    expect(formatStandAge(23)).toBe('23 lata')
    expect(formatStandAge(12)).toBe('12 lat')
    expect(formatStandAge(112)).toBe('112 lat')
    expect(formatStandAge(134)).toBe('134 lata')
    expect(formatStandAge(97)).toBe('97 lat')
  })
})
