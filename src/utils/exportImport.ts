import { db } from '../db/db'
import type { Finding, Trip } from '../db/schema'

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

export async function importData(file: File): Promise<{ findingsImported: number; tripsImported: number }> {
  const text = await file.text()
  const payload = JSON.parse(text) as ExportPayload

  // Zdekodowanie zdjęć (fetch na data: URI) musi zajść PRZED transakcją Dexie:
  // operacje asynchroniczne spoza API Dexie w środku transakcji przedwcześnie ją zamykają.
  const decodedPhotosByOldFindingId = new Map<number, Blob>()
  await Promise.all(
    Object.entries(payload.photosByFindingId ?? {}).map(async ([oldFindingId, base64]) => {
      decodedPhotosByOldFindingId.set(Number(oldFindingId), await base64ToBlob(base64))
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

      const photoBlob = oldFindingId != null ? decodedPhotosByOldFindingId.get(oldFindingId) : undefined
      if (photoBlob) {
        await db.photos.add({ findingId: newFindingId, blob: photoBlob })
      }
    }
  })

  return { findingsImported: payload.findings.length, tripsImported: payload.trips.length }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
