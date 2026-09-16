import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { toast } from 'sonner'
import { db } from '../../db/db'
import speciesData from '../../data/species.json'
import type { Species } from '../../db/schema'
import { useActiveTrip } from '../../stores/useActiveTrip'
import { vibrateSuccess } from '../../utils/haptics'
import { compressPhoto, createThumbnail } from '../../utils/imageUtils'
import { Alert, AlertDescription } from '../../components/ui/alert'
import { Button } from '../../components/ui/button'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '../../components/ui/drawer'
import { Input } from '../../components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Textarea } from '../../components/ui/textarea'

const NONE_SPECIES = '__none__'
const NONE_SPOT = '__none__'

interface AddFindingFormProps {
  initialPosition: [number, number] | null
  onClose: (saved: boolean) => void
}

export function AddFindingForm({ initialPosition, onClose }: AddFindingFormProps) {
  const [speciesId, setSpeciesId] = useState<string>('')
  const [spotId, setSpotId] = useState<number | ''>('')
  const [weightGrams, setWeightGrams] = useState('')
  const [notes, setNotes] = useState('')
  const [photos, setPhotos] = useState<File[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { activeTripId, activeTrip } = useActiveTrip()
  const spots = useLiveQuery(() => db.spots.toArray(), [])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    const species = (speciesData as Species[]).find((s) => s.id === speciesId) ?? null
    try {
      // Kompresja PRZED transakcją, nie w środku niej - createImageBitmap/canvas.toBlob są
      // prawdziwie asynchroniczne (dekodowanie obrazu, praca canvasu poza mikrotaskami, które
      // Dexie potrafi śledzić), więc IndexedDB auto-commituje natywną transakcję w trakcie
      // czekania na nie i kolejny zapis w tej samej transakcji Dexie kończy się realnym
      // `TransactionInactiveError` w prawdziwej przeglądarce - niewidocznym w testach
      // jednostkowych, bo fake-indexeddb nie wymusza tej ścisłości cyklu życia transakcji
      // (złapane w Fazie 20 przez e2e w prawdziwym Chromium). Sama transakcja niżej zawiera już
      // tylko czyste, natywnie-synchroniczne operacje Dexie, więc atomowość (wycofanie całości
      // przy błędzie, np. QuotaExceededError) zostaje zachowana.
      const compressedPhotos = await Promise.all(
        photos.map(async (photo) => ({
          blob: await compressPhoto(photo),
          thumbnailBlob: await createThumbnail(photo),
        })),
      )

      await db.transaction('rw', db.findings, db.photos, async () => {
        const findingId = await db.findings.add({
          speciesId: species?.id ?? null,
          speciesNameGuess: species?.nameCommon ?? null,
          latitude: initialPosition?.[0] ?? null,
          longitude: initialPosition?.[1] ?? null,
          notes,
          createdAt: Date.now(),
          tripId: activeTripId ?? undefined,
          spotId: spotId === '' ? undefined : spotId,
          weightGrams: weightGrams.trim() === '' ? undefined : Number(weightGrams),
        })
        // Schema (Photo.findingId) wspiera wiele zdjęć per znalezisko - zapisy sekwencyjnie, żeby
        // zachować kolejność wyboru użytkownika.
        for (const { blob, thumbnailBlob } of compressedPhotos) {
          await db.photos.add({ findingId, blob, thumbnailBlob })
        }
      })
      // Potwierdzenie zapisu - dotąd formularz po prostu cicho się zamykał, bez żadnego
      // sygnału "udało się". Ten sam moment co w Dzienniku (pusty koszyk -> pierwszy wpis),
      // tylko odwrotnie - to jest "nagroda" za dodanie znaleziska w terenie.
      toast.success(species ? `Dodano do dziennika: ${species.nameCommon}` : 'Dodano znalezisko do dziennika')
      vibrateSuccess()
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

          {spots && spots.length > 0 && (
            <label className="block text-sm">
              Grzybowisko (opcjonalnie)
              <Select
                value={spotId === '' ? NONE_SPOT : String(spotId)}
                onValueChange={(value) => setSpotId(value == null || value === NONE_SPOT ? '' : Number(value))}
              >
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_SPOT}>-- brak --</SelectItem>
                  {spots.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          )}

          <label className="block text-sm">
            Zdjęcia
            <Input
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              onChange={(e) => setPhotos(Array.from(e.target.files ?? []))}
              className="mt-1 h-auto"
            />
            {photos.length > 1 && (
              <p className="mt-1 text-xs text-muted-foreground">Wybrano {photos.length} zdjęć.</p>
            )}
          </label>

          <label className="block text-sm">
            Waga (gramy, opcjonalnie)
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              value={weightGrams}
              onChange={(e) => setWeightGrams(e.target.value)}
              className="mt-1"
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
