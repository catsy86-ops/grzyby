import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../db/db'
import type { Finding } from '../db/schema'
import { countLikelyDuplicates, exportData, importPayload, readExportFile } from './exportImport'
import { createThumbnail } from './imageUtils'

vi.mock('./imageUtils', () => ({
  createThumbnail: vi.fn(async (blob: Blob) => blob),
}))

// Dokładnie ta sama para wywołań, której używa UI (JournalView.handleImportFile ->
// readExportFile -> countLikelyDuplicates -> importPayload). Wcześniej testy przechodziły przez
// wrapper `importData`, którego apka nigdy nie wywoływała - zmiana kontraktu tych dwóch funkcji
// mogła więc przejść testy, nie ruszając realnej ścieżki użytkownika.
async function importFile(file: File) {
  const payload = await readExportFile(file)
  return importPayload(payload)
}

async function clearDatabase() {
  await db.transaction('rw', db.findings, db.trips, db.photos, db.spots, db.tripTrailPoints, async () => {
    await db.findings.clear()
    await db.trips.clear()
    await db.photos.clear()
    await db.spots.clear()
    await db.tripTrailPoints.clear()
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
    const result = await importFile(file)

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

    await expect(importFile(file)).rejects.toThrow()

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
    const result = await importFile(file)

    expect(result.findingsImported).toBe(1)
    expect(await db.findings.count()).toBe(1)
    expect(await db.photos.count()).toBe(0)
  })
})

describe('import - walidacja kształtu pliku', () => {
  it('odrzuca plik, który nie jest obiektem JSON', async () => {
    const file = new File(['[1, 2, 3]'], 'bad.json', { type: 'application/json' })
    await expect(importFile(file)).rejects.toThrow(/oczekiwano obiektu/)
    expect(await db.findings.count()).toBe(0)
  })

  it('odrzuca plik bez tablicy findings', async () => {
    const file = new File([JSON.stringify({ trips: [] })], 'bad.json', { type: 'application/json' })
    await expect(importFile(file)).rejects.toThrow(/listy znalezisk/)
  })

  it('odrzuca plik bez tablicy trips', async () => {
    const file = new File([JSON.stringify({ findings: [] })], 'bad.json', { type: 'application/json' })
    await expect(importFile(file)).rejects.toThrow(/listy wypraw/)
  })

  it('odrzuca znalezisko z niepoprawnym typem pola', async () => {
    const payload = JSON.stringify({
      findings: [{ notes: 'ok', createdAt: 'nie-liczba', latitude: null, longitude: null }],
      trips: [],
    })
    const file = new File([payload], 'bad.json', { type: 'application/json' })
    await expect(importFile(file)).rejects.toThrow(/Znalezisko #1/)
    expect(await db.findings.count()).toBe(0)
  })

  it('odrzuca wyprawę z niepoprawnym typem pola', async () => {
    const payload = JSON.stringify({
      findings: [],
      trips: [{ name: 'Wyprawa', startedAt: 'nie-liczba', endedAt: null, notes: '' }],
    })
    const file = new File([payload], 'bad.json', { type: 'application/json' })
    await expect(importFile(file)).rejects.toThrow(/Wyprawa #1/)
  })

  it('odrzuca niepoprawny format photosByFindingId', async () => {
    const payload = JSON.stringify({ findings: [], trips: [], photosByFindingId: 'nie-obiekt' })
    const file = new File([payload], 'bad.json', { type: 'application/json' })
    await expect(importFile(file)).rejects.toThrow(/format zdjęć/)
  })
})

describe('countLikelyDuplicates', () => {
  function finding(overrides: Partial<Finding> = {}): Finding {
    return {
      speciesId: 'borowik-szlachetny',
      speciesNameGuess: 'Borowik szlachetny',
      notes: 'Test',
      createdAt: 1000,
      latitude: 52.1,
      longitude: 19.5,
      ...overrides,
    }
  }

  it('zwraca 0, gdy żadne znalezisko w pliku nie pasuje do istniejących', () => {
    const payload = { exportedAt: '', version: 2 as const, findings: [finding()], trips: [], photosByFindingId: {} }
    const existing = [finding({ createdAt: 2000 })]

    expect(countLikelyDuplicates(payload, existing)).toBe(0)
  })

  it('liczy znalezisko jako duplikat, gdy wszystkie pola sygnatury się zgadzają (ponowny import tego samego pliku)', () => {
    const shared = finding()
    const payload = { exportedAt: '', version: 2 as const, findings: [shared], trips: [], photosByFindingId: {} }

    expect(countLikelyDuplicates(payload, [shared])).toBe(1)
  })

  it('nie liczy jako duplikatu, gdy różnią się notatki', () => {
    const payload = {
      exportedAt: '',
      version: 2 as const,
      findings: [finding({ notes: 'Inna notatka' })],
      trips: [],
      photosByFindingId: {},
    }

    expect(countLikelyDuplicates(payload, [finding()])).toBe(0)
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
    await importFile(file)

    const photos = await db.photos.toArray()
    expect(photos).toHaveLength(1)
    // Środowisko testowe (fake-indexeddb + jsdom) nie zachowuje `instanceof Blob` po
    // zapisie/odczycie z bazy, dlatego weryfikujemy realny wynik createThumbnail bezpośrednio,
    // zanim trafi do transakcji Dexie.
    expect(thumbnailResult).toBeInstanceOf(Blob)
    expect(thumbnailResult?.size).toBeGreaterThan(0)
  })
})

describe('export/import - trwałość danych poza znaleziskami (format v3)', () => {
  it('eksportuje grzybowiska i przepina spotId na nowe id po imporcie', async () => {
    const spotId = await db.spots.add({
      name: 'Sosnowy zagajnik',
      latitude: 53.4,
      longitude: 14.5,
      notes: 'Za rzeką',
      createdAt: Date.now(),
      revisitMonth: 9,
    })
    await db.findings.add({
      speciesId: 'borowik-szlachetny',
      speciesNameGuess: 'Borowik szlachetny',
      latitude: 53.4,
      longitude: 14.5,
      notes: 'Przy grzybowisku',
      createdAt: Date.now(),
      spotId,
    })

    const blob = await exportData()
    await clearDatabase()

    const result = await importFile(new File([blob], 'export.json', { type: 'application/json' }))

    expect(result.spotsImported).toBe(1)
    expect(result.spotLinksDropped).toBe(0)

    const importedSpot = (await db.spots.toArray())[0]
    const importedFinding = (await db.findings.toArray())[0]
    expect(importedSpot.name).toBe('Sosnowy zagajnik')
    expect(importedSpot.revisitMonth).toBe(9)
    // Sedno: powiązanie wskazuje na grzybowisko z TEGO importu, nie na surowe id z pliku.
    expect(importedFinding.spotId).toBe(importedSpot.id)
  })

  it('czyści spotId przy imporcie pliku v2 (bez grzybowisk), zamiast podpinać znalezisko pod cudze miejsce', async () => {
    // Lokalne grzybowisko, które istnieje PRZED importem - dokładnie ono zostałoby fałszywie
    // "wzbogacone" o cudze znaleziska, gdyby spotId z pliku przepisać bez remapowania.
    const localSpotId = await db.spots.add({
      name: 'Moje własne miejsce',
      latitude: 53.0,
      longitude: 14.0,
      notes: '',
      createdAt: Date.now(),
    })

    const legacyPayload = JSON.stringify({
      exportedAt: new Date().toISOString(),
      version: 2,
      findings: [
        {
          id: 1,
          speciesId: null,
          speciesNameGuess: null,
          latitude: null,
          longitude: null,
          notes: 'Z cudzego telefonu',
          createdAt: Date.now(),
          spotId: localSpotId,
        },
      ],
      trips: [],
    })

    const result = await importFile(new File([legacyPayload], 'v2.json', { type: 'application/json' }))

    expect(result.spotLinksDropped).toBe(1)
    const importedFinding = (await db.findings.toArray())[0]
    expect(importedFinding.spotId).toBeUndefined()
  })

  // Strona eksportu (grupowanie zdjęć w listę per znalezisko) nie da się tu przejść end-to-end:
  // fake-indexeddb zwraca z bazy obiekt, którego jsdom nie uznaje za `Blob`, więc `FileReader`
  // w `blobToBase64` rzuca - to samo ograniczenie środowiska jest już opisane niżej, przy teście
  // miniatur. Testujemy więc stronę odtwarzania z pliku, bo to ona decyduje o tym, czy kopia
  // zapasowa faktycznie przywraca całą galerię.
  it('odtwarza wszystkie zdjęcia znaleziska z listy w pliku v3, nie tylko jedno', async () => {
    const pngDataUri =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='
    const payload = JSON.stringify({
      exportedAt: new Date().toISOString(),
      version: 3,
      findings: [
        {
          id: 1,
          speciesId: null,
          speciesNameGuess: null,
          latitude: null,
          longitude: null,
          notes: 'Galeria',
          createdAt: Date.now(),
        },
      ],
      trips: [],
      spots: [],
      photosByFindingId: { '1': [pngDataUri, pngDataUri, pngDataUri] },
    })

    await importFile(new File([payload], 'v3.json', { type: 'application/json' }))

    expect(await db.photos.count()).toBe(3)
  })

  it('przyjmuje pojedyncze zdjęcie zapisane jako string (format v2), nie tylko listę', async () => {
    const pngDataUri =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='
    const payload = JSON.stringify({
      exportedAt: new Date().toISOString(),
      version: 2,
      findings: [
        {
          id: 7,
          speciesId: null,
          speciesNameGuess: null,
          latitude: null,
          longitude: null,
          notes: 'Stary format',
          createdAt: Date.now(),
        },
      ],
      trips: [],
      photosByFindingId: { '7': pngDataUri },
    })

    await importFile(new File([payload], 'v2.json', { type: 'application/json' }))

    expect(await db.photos.count()).toBe(1)
  })

  it('eksportuje ślad GPS wyprawy i przepina go na nowe id wyprawy', async () => {
    const tripId = await db.trips.add({ name: 'Z trasą', startedAt: Date.now(), endedAt: null, notes: '' })
    await db.tripTrailPoints.add({ tripId, latitude: 53.41, longitude: 14.51, createdAt: Date.now() })
    await db.tripTrailPoints.add({ tripId, latitude: 53.42, longitude: 14.52, createdAt: Date.now() })

    const blob = await exportData()
    await clearDatabase()
    await importFile(new File([blob], 'export.json', { type: 'application/json' }))

    const importedTrip = (await db.trips.toArray())[0]
    const points = await db.tripTrailPoints.toArray()
    expect(points).toHaveLength(2)
    expect(points.every((p) => p.tripId === importedTrip.id)).toBe(true)
  })

  it('odrzuca plik z niepoprawną listą grzybowisk', async () => {
    const payload = JSON.stringify({ findings: [], trips: [], spots: [{ name: 'Bez współrzędnych' }] })
    const file = new File([payload], 'bad.json', { type: 'application/json' })
    await expect(importFile(file)).rejects.toThrow(/Grzybowisko #1/)
  })
})
