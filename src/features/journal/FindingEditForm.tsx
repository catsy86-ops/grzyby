import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { toast } from 'sonner'
import { db } from '../../db/db'
import speciesData from '../../data/species.json'
import type { Finding, Species } from '../../db/schema'
import { getCurrentPosition } from '../../utils/geolocation'
import { Button } from '../../components/ui/button'
import { Card, CardContent } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Textarea } from '../../components/ui/textarea'

const NONE_SPECIES = '__none__'

export interface FindingEditValues {
  speciesId: string | null
  speciesNameGuess: string | null
  notes: string
  weightGrams: number | undefined
  driedWeightGrams: number | undefined
  quantity: number | undefined
  latitude: number | null
  longitude: number | null
  photo: File | null
  removePhoto: boolean
}

// Zwraca `undefined` dla pustego pola (nic nie podano), skończoną nieujemną liczbę dla
// poprawnego wpisu, albo `null` dla błędnego wpisu (np. "12,5" z przecinkiem zamiast kropki,
// częste przy polskiej lokalizacji klawiatury - `Number()` dałoby ciche `NaN` zapisane wprost
// do bazy, bez natywnej walidacji formularza - tu nie ma `<form>`/submit, więc `min`/`type`
// HTML5 na inputach są tylko kosmetyczne, nie blokują wpisania).
function parseOptionalNonNegative(value: string): number | undefined | null {
  if (value.trim() === '') return undefined
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) return null
  return parsed
}

// Faza JOURNAL-AUDIT-ROADMAP.md Tier 0 (2026-09-22): stan pól formularza edycji przeniesiony TU
// z JournalView.tsx (był tam jako 11 `useState` przekazywanych jako 22 propsy) - jako lokalny,
// niekontrolowany stan inicjalizowany raz z `finding` przy montowaniu (`useState`-owy leniwy
// inicjalizator, nie efekt resynchronizujący się przy każdej zmianie `finding` - w trakcie edycji
// świadomie ignorujemy późniejsze zmiany tego samego rekordu z zewnątrz, tak jak wcześniej robił
// to jednorazowy `handleStartEdit` w JournalView). Naprawia dwa problemy naraz: DRY (jeden
// komponent, jeden stan, bez 22 propsów value+onChange) i wydajność (pisanie w polu notatek nie
// dotyka już JournalView, więc nie re-renderuje całej listy kart `FindingCard` przy każdym
// naciśnięciu klawisza). `onSave` liftuje wynik do rodzica dopiero przy faktycznym zapisie.
interface FindingEditFormProps {
  finding: Finding
  onCancel: () => void
  onSave: (id: number, values: FindingEditValues) => Promise<void>
}

export function FindingEditForm({ finding, onCancel, onSave }: FindingEditFormProps) {
  const [editSpeciesId, setEditSpeciesId] = useState(finding.speciesId ?? '')
  const [editNotes, setEditNotes] = useState(finding.notes)
  const [editWeightGrams, setEditWeightGrams] = useState(
    finding.weightGrams != null ? String(finding.weightGrams) : '',
  )
  const [editDriedWeightGrams, setEditDriedWeightGrams] = useState(
    finding.driedWeightGrams != null ? String(finding.driedWeightGrams) : '',
  )
  const [editQuantity, setEditQuantity] = useState(finding.quantity != null ? String(finding.quantity) : '')
  const [editLatitude, setEditLatitude] = useState<number | null>(finding.latitude)
  const [editLongitude, setEditLongitude] = useState<number | null>(finding.longitude)
  const [editPhoto, setEditPhoto] = useState<File | null>(null)
  const [editRemovePhoto, setEditRemovePhoto] = useState(false)
  const [editLocating, setEditLocating] = useState(false)
  const [editSaving, setEditSaving] = useState(false)

  const editingPhoto = useLiveQuery(
    async () => (finding.id != null ? ((await db.photos.where('findingId').equals(finding.id).first()) ?? null) : null),
    [finding.id],
  )
  const hasExistingPhoto = !editPhoto && !!editingPhoto

  async function handleUseCurrentLocation() {
    setEditLocating(true)
    try {
      const coords = await getCurrentPosition()
      setEditLatitude(coords.latitude)
      setEditLongitude(coords.longitude)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Nie udało się ustalić lokalizacji')
    } finally {
      setEditLocating(false)
    }
  }

  async function handleSave() {
    if (finding.id == null) return
    const weightGrams = parseOptionalNonNegative(editWeightGrams)
    const driedWeightGrams = parseOptionalNonNegative(editDriedWeightGrams)
    const quantity = parseOptionalNonNegative(editQuantity)
    if (weightGrams === null || driedWeightGrams === null || quantity === null) {
      toast.error('Waga i liczba sztuk muszą być poprawnymi, nieujemnymi liczbami.')
      return
    }
    const species = (speciesData as Species[]).find((s) => s.id === editSpeciesId) ?? null
    setEditSaving(true)
    try {
      await onSave(finding.id, {
        speciesId: species?.id ?? null,
        speciesNameGuess: species?.nameCommon ?? null,
        notes: editNotes,
        weightGrams,
        driedWeightGrams,
        quantity,
        latitude: editLatitude,
        longitude: editLongitude,
        photo: editPhoto,
        removePhoto: editRemovePhoto,
      })
    } finally {
      setEditSaving(false)
    }
  }

  return (
    // Karta w trybie edycji rozpięta na całą szerokość siatki, niezależnie od tego w której
    // kolumnie by wypadła - ścieśniony formularz w jednej kolumnie 1/3 szerokości byłby
    // niewygodny w użyciu.
    <Card size="sm" className="ring-primary/40 md:col-span-2 lg:col-span-3">
      <CardContent className="flex flex-col gap-2">
        <label className="text-sm">
          Gatunek
          <Select
            value={editSpeciesId || NONE_SPECIES}
            onValueChange={(value) => setEditSpeciesId(value == null || value === NONE_SPECIES ? '' : value)}
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
        <label className="text-sm">
          Notatki
          <Textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} className="mt-1" rows={2} />
        </label>

        <label className="text-sm">
          Waga (gramy)
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            value={editWeightGrams}
            onChange={(e) => setEditWeightGrams(e.target.value)}
            className="mt-1"
          />
        </label>

        <label className="text-sm">
          Waga po wysuszeniu (gramy)
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            value={editDriedWeightGrams}
            onChange={(e) => setEditDriedWeightGrams(e.target.value)}
            className="mt-1"
            placeholder="Opcjonalnie, gdy zbiór był suszony"
          />
        </label>

        <label className="text-sm">
          Liczba sztuk
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            value={editQuantity}
            onChange={(e) => setEditQuantity(e.target.value)}
            className="mt-1"
          />
        </label>

        <div className="text-sm">
          <span>Lokalizacja</span>
          <div className="mt-1 flex items-center gap-2">
            <p className="flex-1 text-xs text-muted-foreground">
              {editLatitude != null && editLongitude != null
                ? `${editLatitude.toFixed(5)}, ${editLongitude.toFixed(5)}`
                : 'Brak lokalizacji'}
            </p>
            <Button type="button" variant="outline" size="sm" disabled={editLocating} onClick={handleUseCurrentLocation}>
              {editLocating ? 'Ustalanie...' : 'Użyj obecnej (GPS)'}
            </Button>
            {editLatitude != null && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditLatitude(null)
                  setEditLongitude(null)
                }}
              >
                Usuń
              </Button>
            )}
          </div>
        </div>

        <label className="text-sm">
          Zdjęcie
          <Input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => {
              setEditPhoto(e.target.files?.[0] ?? null)
              setEditRemovePhoto(false)
            }}
            className="mt-1 h-auto"
          />
        </label>
        {hasExistingPhoto && !editRemovePhoto && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-fit text-destructive"
            onClick={() => setEditRemovePhoto(true)}
          >
            Usuń obecne zdjęcie
          </Button>
        )}
        {editRemovePhoto && <p className="text-xs text-muted-foreground">Zdjęcie zostanie usunięte po zapisaniu.</p>}

        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Anuluj
          </Button>
          <Button size="sm" disabled={editSaving} onClick={handleSave}>
            {editSaving ? 'Zapisywanie...' : 'Zapisz'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
