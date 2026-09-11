import { db } from '../db/db'
import type { Finding, Trip } from '../db/schema'

interface ExportPayload {
  exportedAt: string
  version: 1
  findings: (Omit<Finding, 'photoBlob'> & { photoBase64: string | null })[]
  trips: Trip[]
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
  const [findings, trips] = await Promise.all([db.findings.toArray(), db.trips.toArray()])

  const findingsWithBase64 = await Promise.all(
    findings.map(async ({ photoBlob, ...rest }) => ({
      ...rest,
      photoBase64: photoBlob ? await blobToBase64(photoBlob) : null,
    })),
  )

  const payload: ExportPayload = {
    exportedAt: new Date().toISOString(),
    version: 1,
    findings: findingsWithBase64,
    trips,
  }

  return new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
}

export async function importData(file: File): Promise<{ findingsImported: number; tripsImported: number }> {
  const text = await file.text()
  const payload = JSON.parse(text) as ExportPayload

  const tripIdMap = new Map<number, number>()
  for (const trip of payload.trips) {
    const { id: oldId, ...tripData } = trip
    const newId = await db.trips.add(tripData)
    if (oldId != null) tripIdMap.set(oldId, newId)
  }

  for (const finding of payload.findings) {
    const { id: _oldId, photoBase64, tripId, ...rest } = finding
    await db.findings.add({
      ...rest,
      photoBlob: photoBase64 ? await base64ToBlob(photoBase64) : null,
      tripId: tripId != null ? tripIdMap.get(tripId) : undefined,
    })
  }

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
