import { db } from '../db/db'
import type { Finding, Trip } from '../db/schema'
import { createThumbnail } from './imageUtils'

interface ExportPayload {
  exportedAt: string
  version: 2
  findings: Finding[]
  trips: Trip[]
  // klucz: id znaleziska w chwili eksportu (oryginalny, przed remapowaniem przy imporcie)
  photosByFindingId: Record<number, string>
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
  const [findings, trips, photos] = await Promise.all([
    db.findings.toArray(),
    db.trips.toArray(),
    db.photos.toArray(),
  ])

  const photosByFindingId: Record<number, string> = {}
  await Promise.all(
    photos.map(async (photo) => {
      photosByFindingId[photo.findingId] = await blobToBase64(photo.blob)
    }),
  )

  const payload: ExportPayload = {
    exportedAt: new Date().toISOString(),
    version: 2,
    findings,
    trips,
    photosByFindingId,
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

export async function importPayload(payload: ExportPayload): Promise<{ findingsImported: number; tripsImported: number }> {
  // Zdekodowanie zdjęć i wygenerowanie miniatur musi zajść PRZED transakcją Dexie:
  // operacje asynchroniczne spoza API Dexie w środku transakcji przedwcześnie ją zamykają.
  const decodedPhotosByOldFindingId = new Map<number, { blob: Blob; thumbnailBlob: Blob }>()
  await Promise.all(
    Object.entries(payload.photosByFindingId ?? {}).map(async ([oldFindingId, base64]) => {
      const blob = await base64ToBlob(base64)
      const thumbnailBlob = await createThumbnail(blob)
      decodedPhotosByOldFindingId.set(Number(oldFindingId), { blob, thumbnailBlob })
    }),
  )

  await db.transaction('rw', db.trips, db.findings, db.photos, async () => {
    const tripIdMap = new Map<number, number>()
    for (const trip of payload.trips) {
      const { id: oldId, ...tripData } = trip
      const newId = await db.trips.add(tripData)
      if (oldId != null) tripIdMap.set(oldId, newId)
    }

    for (const finding of payload.findings) {
      const { id: oldFindingId, tripId, ...rest } = finding
      const newFindingId = await db.findings.add({
        ...rest,
        tripId: tripId != null ? tripIdMap.get(tripId) : undefined,
      })

      const photo = oldFindingId != null ? decodedPhotosByOldFindingId.get(oldFindingId) : undefined
      if (photo) {
        await db.photos.add({ findingId: newFindingId, blob: photo.blob, thumbnailBlob: photo.thumbnailBlob })
      }
    }
  })

  return { findingsImported: payload.findings.length, tripsImported: payload.trips.length }
}

export async function importData(file: File): Promise<{ findingsImported: number; tripsImported: number }> {
  const payload = await readExportFile(file)
  return importPayload(payload)
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
