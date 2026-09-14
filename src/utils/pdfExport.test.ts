import { describe, expect, it } from 'vitest'
import type { Finding } from '../db/schema'
import { exportFindingsToPdf } from './pdfExport'

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
