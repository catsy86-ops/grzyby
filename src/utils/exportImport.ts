import { db } from '../db/db'
import type { Finding, Spot, Trip, TripTrailPoint } from '../db/schema'
import { createThumbnail } from './imageUtils'

// Wersja 3 (wcześniej 2) domyka trzy luki, przez które "jedyna kopia zapasowa" tej apki
// (appStore.setLastExportAt, BackupReminderBanner) nie była w istocie pełną kopią:
//   - `spots` w ogóle nie były eksportowane, mimo że `Finding.spotId` owszem - po imporcie na
//     czystym urządzeniu pierwsze utworzone grzybowisko dostawało `++id = 1` i "przygarniało"
//     wszystkie znaleziska z `spotId === 1` z cudzego pliku (ciche fałszywe powiązanie widoczne
//     potem w statystykach spotu i w rankingu "Dziś warto sprawdzić"),
//   - `photosByFindingId` było mapą jedno-zdjęciową, więc ze znaleziska z galerią do kopii
//     trafiało tylko ostatnie zdjęcie, choć schema i UI obsługują wiele (Photo.findingId),
//   - `tripTrailPoints` (ślad GPS wyprawy) nie były zapisywane nigdzie poza IndexedDB.
// Pliki w wersji 2 nadal się importują - patrz `normalizePhotoEntry` i obsługa braku `spots`
// w `importPayload`.
interface ExportPayload {
  exportedAt: string
  version: 2 | 3
  findings: Finding[]
  trips: Trip[]
  // klucz: id znaleziska w chwili eksportu (oryginalny, przed remapowaniem przy imporcie).
  // Wartość: lista zdjęć (v3) albo pojedyncze zdjęcie (v2, pliki sprzed tej zmiany).
  photosByFindingId: Record<number, string[] | string>
  // Od v3. `undefined` w pliku v2 - i to rozróżnienie ma znaczenie przy imporcie: bez tablicy
  // grzybowisk `Finding.spotId` z pliku nie ma do czego się odnosić.
  spots?: Spot[]
  tripTrailPoints?: TripTrailPoint[]
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

async function base64ToBlob(base64: string): Promise<Blob> {
  const response = await fetch(base64)
  return response.blob()
}

export async function exportData(): Promise<Blob> {
  const [findings, trips, photos, spots, tripTrailPoints] = await Promise.all([
    db.findings.toArray(),
    db.trips.toArray(),
    db.photos.toArray(),
    db.spots.toArray(),
    db.tripTrailPoints.toArray(),
  ])

  // Kolejność zdjęć w obrębie znaleziska jest zachowana (`photos` przychodzi posortowane po
  // kluczu głównym, a `AddFindingForm` zapisuje je sekwencyjnie w kolejności wyboru) - galeria
  // po imporcie wygląda więc tak samo jak przed eksportem.
  const photosByFindingId: Record<number, string[]> = {}
  await Promise.all(
    photos.map(async (photo, index) => {
      const base64 = await blobToBase64(photo.blob)
      return { index, findingId: photo.findingId, base64 }
    }),
  ).then((encoded) => {
    for (const { findingId, base64 } of encoded.sort((a, b) => a.index - b.index)) {
      ;(photosByFindingId[findingId] ??= []).push(base64)
    }
  })

  const payload: ExportPayload = {
    exportedAt: new Date().toISOString(),
    version: 3,
    findings,
    trips,
    photosByFindingId,
    spots,
    tripTrailPoints,
  }

  return new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNullableNumber(value: unknown): value is number | null {
  return value === null || typeof value === 'number'
}

// Waliduje kształt pliku importu PRZED jakimkolwiek zapisem do bazy - `JSON.parse` samo w sobie
// nie gwarantuje, że wynik pasuje do `ExportPayload` (może to być dowolny plik JSON podsunięty
// przez użytkownika), a niepoprawny kształt wykryty dopiero w trakcie transakcji/dekodowania zdjęć
// dawał niejasne błędy (np. "Cannot read properties of undefined").
function validateExportPayload(value: unknown): asserts value is ExportPayload {
  if (!isRecord(value)) {
    throw new Error('Plik nie zawiera poprawnych danych eksportu (oczekiwano obiektu JSON).')
  }
  if (!Array.isArray(value.findings)) {
    throw new Error('Plik nie zawiera poprawnej listy znalezisk.')
  }
  if (!Array.isArray(value.trips)) {
    throw new Error('Plik nie zawiera poprawnej listy wypraw.')
  }
  if (value.photosByFindingId !== undefined && !isRecord(value.photosByFindingId)) {
    throw new Error('Plik zawiera niepoprawny format zdjęć.')
  }
  // `spots`/`tripTrailPoints` istnieją dopiero od v3 - brak pola jest poprawnym plikiem v2,
  // ale pole obecne i niebędące tablicą to już uszkodzony plik.
  if (value.spots !== undefined && !Array.isArray(value.spots)) {
    throw new Error('Plik zawiera niepoprawną listę grzybowisk.')
  }
  if (value.tripTrailPoints !== undefined && !Array.isArray(value.tripTrailPoints)) {
    throw new Error('Plik zawiera niepoprawny format śladu wyprawy.')
  }

  value.spots?.forEach((spot, index) => {
    if (
      !isRecord(spot) ||
      typeof spot.name !== 'string' ||
      typeof spot.latitude !== 'number' ||
      typeof spot.longitude !== 'number' ||
      typeof spot.notes !== 'string' ||
      typeof spot.createdAt !== 'number'
    ) {
      throw new Error(`Grzybowisko #${index + 1} w pliku ma niepoprawny format.`)
    }
  })

  value.findings.forEach((finding, index) => {
    if (
      !isRecord(finding) ||
      typeof finding.notes !== 'string' ||
      typeof finding.createdAt !== 'number' ||
      !isNullableNumber(finding.latitude) ||
      !isNullableNumber(finding.longitude) ||
      (finding.speciesId !== null && typeof finding.speciesId !== 'string') ||
      (finding.speciesNameGuess !== null && typeof finding.speciesNameGuess !== 'string')
    ) {
      throw new Error(`Znalezisko #${index + 1} w pliku ma niepoprawny format.`)
    }
  })

  value.trips.forEach((trip, index) => {
    if (
      !isRecord(trip) ||
      typeof trip.name !== 'string' ||
      typeof trip.startedAt !== 'number' ||
      !isNullableNumber(trip.endedAt) ||
      typeof trip.notes !== 'string'
    ) {
      throw new Error(`Wyprawa #${index + 1} w pliku ma niepoprawny format.`)
    }
  })
}

export type { ExportPayload }

// Parsuje i waliduje plik importu bez zapisywania czegokolwiek do bazy - pozwala np. sprawdzić
// możliwe duplikaty (patrz `countLikelyDuplicates`) i poprosić użytkownika o potwierdzenie, zanim
// `importPayload` faktycznie zapisze dane.
export async function readExportFile(file: File): Promise<ExportPayload> {
  const text = await file.text()
  const parsed: unknown = JSON.parse(text)
  validateExportPayload(parsed)
  return parsed
}

// Sygnatura znaleziska do wykrywania duplikatów przy ponownym imporcie tego samego pliku -
// nie porównujemy id (remapowane przy każdym imporcie), tylko treść, która powinna być
// identyczna dla dokładnie tego samego znaleziska wyeksportowanego dwa razy.
function findingSignature(finding: Pick<Finding, 'speciesId' | 'notes' | 'createdAt' | 'latitude' | 'longitude'>) {
  return [finding.speciesId, finding.notes, finding.createdAt, finding.latitude, finding.longitude].join('|')
}

// Liczy, ile znalezisk z pliku importu ma dokładnie taką samą sygnaturę jak znalezisko już
// zapisane w dzienniku - wysoki wynik oznacza najczęściej ponowny import tego samego pliku.
export function countLikelyDuplicates(payload: ExportPayload, existingFindings: Finding[]): number {
  const existingSignatures = new Set(existingFindings.map(findingSignature))
  return payload.findings.filter((finding) => existingSignatures.has(findingSignature(finding))).length
}

// Pliki v2 trzymały pod kluczem znaleziska jeden string base64, v3 trzyma listę - obie postacie
// sprowadzamy do listy, żeby reszta importu miała jeden kształt danych.
function normalizePhotoEntry(entry: string[] | string): string[] {
  return Array.isArray(entry) ? entry : [entry]
}

export interface ImportResult {
  findingsImported: number
  tripsImported: number
  spotsImported: number
  // Ile znalezisk straciło powiązanie z grzybowiskiem, bo plik był w starym formacie (v2, bez
  // tablicy `spots`) - UI mówi o tym użytkownikowi wprost, zamiast po cichu podpinać je pod
  // przypadkowe, lokalne grzybowisko o tym samym id.
  spotLinksDropped: number
}

export async function importPayload(payload: ExportPayload): Promise<ImportResult> {
  // Zdekodowanie zdjęć i wygenerowanie miniatur musi zajść PRZED transakcją Dexie:
  // operacje asynchroniczne spoza API Dexie w środku transakcji przedwcześnie ją zamykają.
  const decodedPhotosByOldFindingId = new Map<number, { blob: Blob; thumbnailBlob: Blob }[]>()
  await Promise.all(
    Object.entries(payload.photosByFindingId ?? {}).map(async ([oldFindingId, entry]) => {
      const decoded = await Promise.all(
        normalizePhotoEntry(entry).map(async (base64) => {
          const blob = await base64ToBlob(base64)
          return { blob, thumbnailBlob: await createThumbnail(blob) }
        }),
      )
      decodedPhotosByOldFindingId.set(Number(oldFindingId), decoded)
    }),
  )

  // Plik bez tablicy `spots` (format v2) niesie `Finding.spotId`, które wskazuje na grzybowiska
  // z INNEJ bazy - zachowanie takiego id byłoby gorsze niż jego utrata, bo po utworzeniu
  // pierwszego lokalnego grzybowiska (`++id = 1`) znaleziska z pliku zostałyby po cichu
  // przypisane do miejsca, w którym nigdy nie były.
  const hasSpots = Array.isArray(payload.spots)
  let spotLinksDropped = 0

  await db.transaction('rw', db.trips, db.findings, db.photos, db.spots, db.tripTrailPoints, async () => {
    const spotIdMap = new Map<number, number>()
    for (const spot of payload.spots ?? []) {
      const { id: oldId, ...spotData } = spot
      const newId = await db.spots.add(spotData)
      if (oldId != null) spotIdMap.set(oldId, newId)
    }

    const tripIdMap = new Map<number, number>()
    for (const trip of payload.trips) {
      const { id: oldId, ...tripData } = trip
      const newId = await db.trips.add(tripData)
      if (oldId != null) tripIdMap.set(oldId, newId)
    }

    for (const finding of payload.findings) {
      const { id: oldFindingId, tripId, spotId, ...rest } = finding
      const remappedSpotId = spotId != null && hasSpots ? spotIdMap.get(spotId) : undefined
      if (spotId != null && remappedSpotId == null) spotLinksDropped++

      const newFindingId = await db.findings.add({
        ...rest,
        tripId: tripId != null ? tripIdMap.get(tripId) : undefined,
        spotId: remappedSpotId,
      })

      const photos = oldFindingId != null ? decodedPhotosByOldFindingId.get(oldFindingId) : undefined
      for (const photo of photos ?? []) {
        await db.photos.add({ findingId: newFindingId, blob: photo.blob, thumbnailBlob: photo.thumbnailBlob })
      }
    }

    // Punkt śladu bez odpowiadającej wyprawy w pliku byłby sierotą (nic go nigdy nie narysuje
    // ani nie posprząta), więc przepisujemy tylko te, których wyprawa faktycznie przyszła.
    for (const point of payload.tripTrailPoints ?? []) {
      const newTripId = tripIdMap.get(point.tripId)
      if (newTripId == null) continue
      const { id: _oldId, ...pointData } = point
      await db.tripTrailPoints.add({ ...pointData, tripId: newTripId })
    }
  })

  return {
    findingsImported: payload.findings.length,
    tripsImported: payload.trips.length,
    spotsImported: payload.spots?.length ?? 0,
    spotLinksDropped,
  }
}

// Wspólny wzorzec nazwy pliku eksportu - dotąd powtórzony osobno w handleExportPdf/Gpx/Csv w
// JournalView.tsx. `tripName` to nazwa aktualnie wybranej wyprawy (filtr Dziennika), `undefined`
// gdy eksport dotyczy całego dziennika (bez filtra po wyprawie).
export function buildExportFilename(tripName: string | undefined, extension: string): string {
  const base = tripName ? tripName.replace(/\s+/g, '-').toLowerCase() : 'dziennik'
  const date = new Date().toISOString().slice(0, 10)
  return `lysy-${base}-${date}.${extension}`
}
