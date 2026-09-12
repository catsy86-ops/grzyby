import { useState } from 'react'
import { db } from '../../db/db'
import speciesData from '../../data/species.json'
import type { Species } from '../../db/schema'
import { useActiveTrip } from '../../stores/useActiveTrip'
import { createThumbnail } from '../../utils/imageUtils'
import { Alert, AlertDescription } from '../../components/ui/alert'
import { Button } from '../../components/ui/button'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '../../components/ui/drawer'
import { Input } from '../../components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Textarea } from '../../components/ui/textarea'

const NONE_SPECIES = '__none__'

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
    <Drawer
      open
      showSwipeHandle
      onOpenChange={(open) => {
        if (!open) onClose(false)
      }}
    >
      <DrawerContent className="mx-auto max-w-md">
        <DrawerHeader>
          <DrawerTitle>Nowe znalezisko</DrawerTitle>
          {activeTrip && (
            <p className="text-xs text-green-700">🥾 Zostanie dodane do wyprawy: {activeTrip.name}</p>
          )}
        </DrawerHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-4 pt-2">
          <label className="block text-sm">
            Gatunek (opcjonalnie)
            <Select
              value={speciesId || NONE_SPECIES}
              onValueChange={(value) => setSpeciesId(value == null || value === NONE_SPECIES ? '' : value)}
            >
              <SelectTrigger className="mt-1 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_SPECIES}>-- nieokreślony --</SelectItem>
                {(speciesData as Species[]).map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.nameCommon} ({s.nameLatin})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          <label className="block text-sm">
            Zdjęcie
            <Input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
              className="mt-1 h-auto"
            />
          </label>

          <label className="block text-sm">
            Notatki
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1" rows={3} />
          </label>

          {!initialPosition && (
            <Alert variant="warning">
              <AlertDescription className="text-current">
                Brak ustalonej lokalizacji — znalezisko zostanie zapisane bez współrzędnych.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={() => onClose(false)}>
              Anuluj
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Zapisywanie...' : 'Zapisz'}
            </Button>
          </div>
        </form>
      </DrawerContent>
    </Drawer>
  )
}
