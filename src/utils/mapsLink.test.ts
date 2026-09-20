import { describe, expect, it } from 'vitest'
import { buildGoogleMapsUrl } from './mapsLink'

describe('buildGoogleMapsUrl', () => {
  it('buduje link Google Maps ze współrzędnych', () => {
    expect(buildGoogleMapsUrl(53.4285, 14.5528)).toBe('https://www.google.com/maps?q=53.4285,14.5528')
  })
})
