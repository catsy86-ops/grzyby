import { describe, expect, it } from 'vitest'
import { buildGpx } from './gpxExport'
import type { Finding } from '../db/schema'

function makeFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    id: 1,
    speciesId: null,
    speciesNameGuess: 'Borowik szlachetny',
    latitude: 52.1,
    longitude: 19.5,
    notes: '',
    createdAt: Date.UTC(2026, 8, 1, 10, 0),
    ...overrides,
  }
}

describe('buildGpx', () => {
  it('generuje poprawny nagłówek GPX 1.1', () => {
    const gpx = buildGpx([])
    expect(gpx).toContain('<?xml version="1.0" encoding="UTF-8"?>')
    expect(gpx).toContain('<gpx version="1.1"')
  })

  it('pomija znaleziska bez współrzędnych', () => {
    const gpx = buildGpx([makeFinding({ latitude: null, longitude: null })])
    expect(gpx).not.toContain('<wpt')
  })

  it('tworzy waypoint ze współrzędnymi, nazwą i czasem dla znaleziska z lokalizacją', () => {
    const gpx = buildGpx([makeFinding()])
    expect(gpx).toContain('<wpt lat="52.1" lon="19.5">')
    expect(gpx).toContain('<name>Borowik szlachetny</name>')
    expect(gpx).toContain('<time>2026-09-01T10:00:00.000Z</time>')
  })

  it('ucieka znaki specjalne XML w nazwie i notatkach', () => {
    const gpx = buildGpx([makeFinding({ speciesNameGuess: 'A & B <test>', notes: 'notatka "z cudzysłowem"' })])
    expect(gpx).toContain('A &amp; B &lt;test&gt;')
    expect(gpx).toContain('notatka &quot;z cudzysłowem&quot;')
  })
})
