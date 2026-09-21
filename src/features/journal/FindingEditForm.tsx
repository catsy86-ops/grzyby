import speciesData from '../../data/species.json'
import type { Species } from '../../db/schema'
import { Button } from '../../components/ui/button'
import { Card, CardContent } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Textarea } from '../../components/ui/textarea'

const NONE_SPECIES = '__none__'

// Wydzielone z JournalView.tsx (Faza 27, redukcja rozmiaru pliku) - karta w trybie edycji
// znaleziska, dotąd inline'owana bezpośrednio w mapowaniu listy. Cały stan formularza edycji
// (editSpeciesId/editNotes/itd.) zostaje w JournalView jako "źródło prawdy" - ten komponent jest
// czystą prezentacją nad kontrolowanymi polami, bez własnego stanu.
interface FindingEditFormProps {
  editSpeciesId: string
  onEditSpeciesIdChange: (value: string) => void
  editNotes: string
  onEditNotesChange: (value: string) => void
  editWeightGrams: string
  onEditWeightGramsChange: (value: string) => void
  editDriedWeightGrams: string
  onEditDriedWeightGramsChange: (value: string) => void
  editQuantity: string
  onEditQuantityChange: (value: string) => void
  editLatitude: number | null
  editLongitude: number | null
  onClearLocation: () => void
  editLocating: boolean
  onUseCurrentLocation: () => void
  onPhotoChange: (file: File | null) => void
  hasExistingPhoto: boolean
  editRemovePhoto: boolean
  onRemovePhoto: () => void
  editSaving: boolean
  onCancel: () => void
  onSave: () => void
}

export function FindingEditForm({
  editSpeciesId,
  onEditSpeciesIdChange,
  editNotes,
  onEditNotesChange,
  editWeightGrams,
  onEditWeightGramsChange,
  editDriedWeightGrams,
  onEditDriedWeightGramsChange,
  editQuantity,
  onEditQuantityChange,
  editLatitude,
  editLongitude,
  onClearLocation,
  editLocating,
  onUseCurrentLocation,
  onPhotoChange,
  hasExistingPhoto,
  editRemovePhoto,
  onRemovePhoto,
  editSaving,
  onCancel,
  onSave,
}: FindingEditFormProps) {
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
            onValueChange={(value) => onEditSpeciesIdChange(value == null || value === NONE_SPECIES ? '' : value)}
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
          <Textarea value={editNotes} onChange={(e) => onEditNotesChange(e.target.value)} className="mt-1" rows={2} />
        </label>

        <label className="text-sm">
          Waga (gramy)
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            value={editWeightGrams}
            onChange={(e) => onEditWeightGramsChange(e.target.value)}
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
            onChange={(e) => onEditDriedWeightGramsChange(e.target.value)}
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
            onChange={(e) => onEditQuantityChange(e.target.value)}
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
            <Button type="button" variant="outline" size="sm" disabled={editLocating} onClick={onUseCurrentLocation}>
              {editLocating ? 'Ustalanie...' : 'Użyj obecnej (GPS)'}
            </Button>
            {editLatitude != null && (
              <Button type="button" variant="ghost" size="sm" onClick={onClearLocation}>
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
            onChange={(e) => onPhotoChange(e.target.files?.[0] ?? null)}
            className="mt-1 h-auto"
          />
        </label>
        {hasExistingPhoto && !editRemovePhoto && (
          <Button type="button" variant="ghost" size="sm" className="w-fit text-destructive" onClick={onRemovePhoto}>
            Usuń obecne zdjęcie
          </Button>
        )}
        {editRemovePhoto && <p className="text-xs text-muted-foreground">Zdjęcie zostanie usunięte po zapisaniu.</p>}

        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Anuluj
          </Button>
          <Button size="sm" disabled={editSaving} onClick={onSave}>
            {editSaving ? 'Zapisywanie...' : 'Zapisz'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
