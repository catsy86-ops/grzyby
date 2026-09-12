import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../db/db'
import { exportData, importData } from './exportImport'
import { createThumbnail } from './imageUtils'

vi.mock('./imageUtils', () => ({
  createThumbnail: vi.fn(async (blob: Blob) => blob),
}))

async function clearDatabase() {
  await db.transaction('rw', db.findings, db.trips, db.photos, async () => {
    await db.findings.clear()
    await db.trips.clear()
    await db.photos.clear()
  })
}

beforeEach(async () => {
  await clearDatabase()
})

describe('export/import', () => {
  it('eksportuje i importuje znaleziska oraz wyprawy z zachowaniem liczby rekordów', async () => {
    const tripId = await db.trips.add({ name: 'Testowa wyprawa', startedAt: Date.now(), endedAt: null, notes: '' })
    await db.findings.add({
      speciesId: 'borowik-szlachetny',
      speciesNameGuess: 'Borowik szlachetny',
      latitude: 52.1,
      longitude: 19.5,
      notes: 'Test',
      createdAt: Date.now(),
      tripId,
    })

    const blob = await exportData()
    await clearDatabase()

    const file = new File([blob], 'export.json', { type: 'application/json' })
    const result = await importData(file)

    expect(result.findingsImported).toBe(1)
    expect(result.tripsImported).toBe(1)
    expect(await db.findings.count()).toBe(1)
    expect(await db.trips.count()).toBe(1)

    const importedFinding = (await db.findings.toArray())[0]
    const importedTrip = (await db.trips.toArray())[0]
    expect(importedFinding.tripId).toBe(importedTrip.id)
  })

  it('nie zostawia częściowo zaimportowanych danych, gdy import się nie powiedzie (transakcyjność)', async () => {
    await db.trips.add({ name: 'Wyprawa 1', startedAt: Date.now(), endedAt: null, notes: '' })
    await db.findings.add({
      speciesId: null,
      speciesNameGuess: null,
      latitude: null,
      longitude: null,
      notes: 'Ma zostać uszkodzona',
      createdAt: Date.now(),
    })

    const corruptedPayload = JSON.stringify({
      exportedAt: new Date().toISOString(),
      version: 2,
      findings: [
        {
          id: 1,
          speciesId: null,
          speciesNameGuess: null,
          latitude: null,
          longitude: null,
          notes: 'Poprawny wpis',
          createdAt: Date.now(),
        },
      ],
      trips: [{ id: 1, name: 'Wyprawa importowana', startedAt: Date.now(), endedAt: null, notes: '' }],
      // photosByFindingId z niepoprawnym base64 - base64ToBlob rzuci błąd
      photosByFindingId: { '1': 'not-a-valid-data-uri' },
    })

    const file = new File([corruptedPayload], 'corrupted.json', { type: 'application/json' })

    await expect(importData(file)).rejects.toThrow()

    // Stan sprzed importu (1 istniejące znalezisko, 1 wyprawa) musi pozostać niezmieniony -
    // uszkodzony import nie mógł dodać kolejnej wyprawy/znaleziska.
    expect(await db.findings.count()).toBe(1)
    expect(await db.trips.count()).toBe(1)
  })

  it('importuje payload bez klucza photosByFindingId (kompatybilność ze starszym formatem eksportu)', async () => {
    const payload = JSON.stringify({
      exportedAt: new Date().toISOString(),
      version: 2,
      findings: [
        {
          id: 1,
          speciesId: null,
          speciesNameGuess: null,
          latitude: null,
          longitude: null,
          notes: 'Bez zdjęcia, starszy format',
          createdAt: Date.now(),
        },
      ],
      trips: [],
      // photosByFindingId celowo pominięty
    })

    const file = new File([payload], 'legacy-export.json', { type: 'application/json' })
    const result = await importData(file)

    expect(result.findingsImported).toBe(1)
    expect(await db.findings.count()).toBe(1)
    expect(await db.photos.count()).toBe(0)
  })
})

describe('export/import - generowanie miniatur (bez mocka createThumbnail)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    vi.mocked(createThumbnail).mockImplementation(async (blob: Blob) => blob)
  })

  it('generuje realną miniaturę zdjęcia podczas importu', async () => {
    const bitmap = { width: 10, height: 10, close: vi.fn() }
    vi.stubGlobal('createImageBitmap', vi.fn(async () => bitmap))
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage: vi.fn(),
    } as any)
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback: BlobCallback) =>
      callback(new Blob(['thumb'], { type: 'image/jpeg' })),
    )
    const { createThumbnail: realCreateThumbnail } =
      await vi.importActual<typeof import('./imageUtils')>('./imageUtils')
    let thumbnailResult: Blob | undefined
    vi.mocked(createThumbnail).mockImplementation(async (blob: Blob) => {
      thumbnailResult = await realCreateThumbnail(blob)
      return thumbnailResult
    })

    const pngDataUri =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='
    const payload = JSON.stringify({
      exportedAt: new Date().toISOString(),
      version: 2,
      findings: [
        {
          id: 1,
          speciesId: null,
          speciesNameGuess: null,
          latitude: null,
          longitude: null,
          notes: 'Ze zdjęciem',
          createdAt: Date.now(),
        },
      ],
      trips: [],
      photosByFindingId: { '1': pngDataUri },
    })

    const file = new File([payload], 'with-photo.json', { type: 'application/json' })
    await importData(file)

    const photos = await db.photos.toArray()
    expect(photos).toHaveLength(1)
    // Środowisko testowe (fake-indexeddb + jsdom) nie zachowuje `instanceof Blob` po
    // zapisie/odczycie z bazy, dlatego weryfikujemy realny wynik createThumbnail bezpośrednio,
    // zanim trafi do transakcji Dexie.
    expect(thumbnailResult).toBeInstanceOf(Blob)
    expect(thumbnailResult?.size).toBeGreaterThan(0)
  })
})
