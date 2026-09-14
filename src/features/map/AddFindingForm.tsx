import { useState } from 'react'
import { toast } from 'sonner'
import { db } from '../../db/db'
import speciesData from '../../data/species.json'
import type { Species } from '../../db/schema'
import { useActiveTrip } from '../../stores/useActiveTrip'
import { compressPhoto, createThumbnail } from '../../utils/imageUtils'
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
  const [error, setError] = useState<string | null>(null)
  const { activeTripId, activeTrip } = useActiveTrip()

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)
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
        const [photoBlob, thumbnailBlob] = await Promise.all([compressPhoto(photo), createThumbnail(photo)])
        await db.photos.add({ findingId, blob: photoBlob, thumbnailBlob })
      }
      onClose(true)
    } catch (err) {
      // Natywny DOMException (rzucany przez IndexedDB przy przekroczeniu limitu) NIE dziedziczy
      // po Error, więc sprawdzamy `name` bezpośrednio zamiast polegać na `instanceof Error`.
      const errorName = err != null && typeof err === 'object' && 'name' in err ? (err as { name: unknown }).name : undefined
      const message =
        errorName === 'QuotaExceededError'
          ? 'Brak miejsca na urządzeniu - zwolnij pamięć (np. w "Pamięć i dane") i spróbuj ponownie.'
          : 'Nie udało się zapisać znaleziska. Spróbuj ponownie.'
      setError(message)
      toast.error(message)
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
            <p className="text-xs text-primary">🥾 Zostanie dodane do wyprawy: {activeTrip.name}</p>
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

          {error && (
            <Alert variant="destructive-soft">
              <AlertDescription className="text-current">{error}</AlertDescription>
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
