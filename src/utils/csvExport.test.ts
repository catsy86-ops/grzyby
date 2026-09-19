import { describe, expect, it } from 'vitest'
import { buildCsv } from './csvExport'
import type { Finding } from '../db/schema'

function makeFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    speciesId: null,
    speciesNameGuess: 'Borowik szlachetny',
    latitude: 53.4,
    longitude: 14.5,
    notes: '',
    createdAt: Date.UTC(2026, 8, 1, 10, 0, 0),
    ...overrides,
  }
}

describe('buildCsv', () => {
  it('starts with a UTF-8 BOM so Excel reads Polish characters correctly', () => {
    const csv = buildCsv([])
    expect(csv.charCodeAt(0)).toBe(0xfeff)
  })

  it('includes the header row', () => {
    const csv = buildCsv([])
    expect(csv).toContain('Data,Gatunek,Ilość,Waga (g),Waga sucha (g),Notatki,Szerokość,Długość')
  })

  it('renders a finding row with its fields', () => {
    const csv = buildCsv([makeFinding({ quantity: 3, weightGrams: 250 })])
    expect(csv).toContain('Borowik szlachetny')
    expect(csv).toContain('3')
    expect(csv).toContain('250')
    expect(csv).toContain('53.4')
    expect(csv).toContain('14.5')
  })

  it('quotes and escapes notes containing commas or quotes', () => {
    const csv = buildCsv([makeFinding({ notes: 'Blisko drogi, "duży" okaz' })])
    expect(csv).toContain('"Blisko drogi, ""duży"" okaz"')
  })
})
