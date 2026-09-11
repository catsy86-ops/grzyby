import { useState } from 'react'
import { db } from '../../db/db'
import speciesData from '../../data/species.json'
import type { Species } from '../../db/schema'
import { useActiveTrip } from '../../stores/useActiveTrip'
import { createThumbnail } from '../../utils/imageUtils'

interface AddFindingFormProps {
  initialPosition: [number, number] | null
  onClose: (saved: boolean) => void
}

export function AddFindingForm({ initialPosition, onClose }: AddFindingFormProps) {
  const [speciesId, setSpeciesId] = useState<string>('')
  const [notes, setNotes] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const { activeTripId, activeTrip } = useActiveTrip()

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    const species = (speciesData as Species[]).find((s) => s.id === speciesId) ?? null
    try {
      const findingId = await db.findings.add({
        speciesId: species?.id ?? null,
        speciesNameGuess: species?.nameCommon ?? null,
        latitude: initialPosition?.[0] ?? null,
        longitude: initialPosition?.[1] ?? null,
        notes,
        createdAt: Date.now(),
        tripId: activeTripId ?? undefined,
      })
      if (photo) {
        const thumbnailBlob = await createThumbnail(photo)
        await db.photos.add({ findingId, blob: photo, thumbnailBlob })
      }
      onClose(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[1100] flex items-end justify-center bg-black/40 sm:items-center">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-t-2xl bg-white p-4 shadow-lg sm:rounded-2xl"
      >
        <h2 className="mb-1 text-lg font-semibold">Nowe znalezisko</h2>
        {activeTrip && (
          <p className="mb-3 text-xs text-green-700">🥾 Zostanie dodane do wyprawy: {activeTrip.name}</p>
        )}

        <label className="mb-3 block text-sm">
          Gatunek (opcjonalnie)
          <select
            value={speciesId}
            onChange={(e) => setSpeciesId(e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 p-2"
          >
            <option value="">-- nieokreślony --</option>
            {(speciesData as Species[]).map((s) => (
              <option key={s.id} value={s.id}>
                {s.nameCommon} ({s.nameLatin})
              </option>
            ))}
          </select>
        </label>

        <label className="mb-3 block text-sm">
          Zdjęcie
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
            className="mt-1 w-full text-sm"
          />
        </label>

        <label className="mb-4 block text-sm">
          Notatki
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 p-2"
            rows={3}
          />
        </label>

        {!initialPosition && (
          <p className="mb-3 text-xs text-amber-700">
            Brak ustalonej lokalizacji — znalezisko zostanie zapisane bez współrzędnych.
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => onClose(false)}
            className="rounded px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
          >
            Anuluj
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded bg-green-800 px-4 py-2 text-sm font-medium text-white hover:bg-green-900 disabled:opacity-50"
          >
            {saving ? 'Zapisywanie...' : 'Zapisz'}
          </button>
        </div>
      </form>
    </div>
  )
}
