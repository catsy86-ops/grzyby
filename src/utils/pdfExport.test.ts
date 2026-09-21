import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Finding, Species } from '../db/schema'
import speciesData from '../data/species.json'
import { exportFindingsToPdf, exportSpeciesCardToPdf } from './pdfExport'

function finding(overrides: Partial<Finding> = {}): Finding {
  return {
    speciesId: null,
    speciesNameGuess: 'Testowy gatunek',
    latitude: 52.1,
    longitude: 19.5,
    notes: 'Notatka testowa',
    createdAt: Date.now(),
    ...overrides,
  }
}

describe('exportFindingsToPdf', () => {
  it('generuje niepusty PDF blob dla listy znalezisk', async () => {
    const blob = await exportFindingsToPdf([finding(), finding({ speciesNameGuess: 'Drugi gatunek' })], {
      title: 'Dziennik zbiorów',
    })

    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe('application/pdf')
    expect(blob.size).toBeGreaterThan(0)
  })

  it('generuje poprawny PDF dla pustej listy znalezisk', async () => {
    const blob = await exportFindingsToPdf([], { title: 'Pusty dziennik' })

    expect(blob.size).toBeGreaterThan(0)
  })

  it('nie rzuca błędu przy bardzo długiej notatce (zawijanie tekstu) i wielu znaleziskach', async () => {
    const longNote = 'Bardzo długa notatka. '.repeat(50)
    const many = Array.from({ length: 60 }, (_, i) => finding({ notes: longNote, createdAt: i }))

    const blob = await exportFindingsToPdf(many, { title: 'Duży dziennik', subtitle: 'Test paginacji' })

    expect(blob.size).toBeGreaterThan(0)
  })

  it('uwzględnia informacje o wyprawie, gdy podane', async () => {
    const blob = await exportFindingsToPdf([finding({ weightGrams: 200 })], {
      title: 'Wyprawa testowa',
      tripInfo: { startedAt: 1000, endedAt: 5_000_000 },
    })

    expect(blob.size).toBeGreaterThan(0)
  })
})

describe('exportSpeciesCardToPdf', () => {
  const allSpecies = speciesData as Species[]
  const borowik = allSpecies.find((s) => s.id === 'borowik-szlachetny')!

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('generuje niepusty PDF blob dla gatunku bez dostępnego zdjęcia (offline/fetch padł)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))

    const blob = await exportSpeciesCardToPdf(borowik, allSpecies)

    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe('application/pdf')
    expect(blob.size).toBeGreaterThan(0)
  })

  it('generuje PDF ze zdjęciem, gdy fetch się powiedzie', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        blob: async () => new Blob(['dane-obrazka'], { type: 'image/jpeg' }),
      }),
    )

    const blob = await exportSpeciesCardToPdf(borowik, allSpecies)

    expect(blob.size).toBeGreaterThan(0)
  })

  it('nie rzuca błędu dla gatunku bez porad przygotowania/ochrony prawnej/sobowtórów', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    const bare: Species = {
      id: 'test',
      nameCommon: 'Testowy gatunek',
      nameLatin: 'Testus testicus',
      edibility: 'niejadalny',
      description: 'Opis testowy.',
      habitat: 'Wszędzie',
      season: 'Cały rok',
      lookalikes: [],
      imageUrls: [],
    }

    const blob = await exportSpeciesCardToPdf(bare, allSpecies)

    expect(blob.size).toBeGreaterThan(0)
  })

  it('działa dla wszystkich gatunków w species.json bez rzucania błędu', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    for (const species of allSpecies) {
      const blob = await exportSpeciesCardToPdf(species, allSpecies)
      expect(blob.size).toBeGreaterThan(0)
    }
  })
})
