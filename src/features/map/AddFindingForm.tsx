import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { toast } from 'sonner'
import { CheckIcon, MicIcon, MinusIcon, PlusIcon } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { db } from '../../db/db'
import speciesData from '../../data/species.json'
import type { Species } from '../../db/schema'
import { useActiveTrip } from '../../stores/useActiveTrip'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { useSpeechToText } from '../../hooks/useSpeechToText'
import { vibrateSuccess } from '../../utils/haptics'
import { compressPhoto, createThumbnail } from '../../utils/imageUtils'
import {
  DUPLICATE_WINDOW_MS,
  getLastSpeciesId,
  isLikelyDuplicateFinding,
  rememberLastSpeciesId,
} from '../../utils/duplicateFindingCheck'
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
  // Zdjęcie z PWA `share_target` (Udostępnij z innej apki, patrz MapView.tsx) - od razu wpięte do
  // listy zdjęć formularza, tak jakby użytkownik sam je wybrał.
  initialPhoto?: File | null
  // Gatunek rozpoznany przez skaner AI (features/identify/PredictionCard.tsx, przez
  // appStore.pendingIdentifiedSpeciesId, konsumowany jednorazowo w MapView.tsx) - nadrzędny
  // względem "ostatnio wybranego gatunku" niżej, bo to świeża, konkretna sugestia dla TEGO
  // znaleziska, nie ogólna podpowiedź z historii.
  initialSpeciesId?: string | null
  onClose: (saved: boolean) => void
}

export function AddFindingForm({ initialPosition, initialPhoto, initialSpeciesId, onClose }: AddFindingFormProps) {
  // Podpowiada ostatnio wybrany gatunek zamiast zawsze startować od "-- nieokreślony --" - przy
  // zbieraniu jednego gatunku seriami oszczędza powtarzanie tego samego wyboru za każdym razem.
  // Sprawdzone przeciwko species.json na wypadek gdyby zapamiętany id już nie istniał.
  const [speciesId, setSpeciesId] = useState<string>(() => {
    if (initialSpeciesId != null && (speciesData as Species[]).some((s) => s.id === initialSpeciesId)) {
      return initialSpeciesId
    }
    const last = getLastSpeciesId()
    return last != null && (speciesData as Species[]).some((s) => s.id === last) ? last : ''
  })
  const [spotId, setSpotId] = useState<number | ''>('')
  const [weightGrams, setWeightGrams] = useState('')
  // Liczba sztuk - `null` = nie podano (nie zakładamy "1", patrz komentarz przy Finding.quantity
  // w schema.ts). `flyUp` to nonce, który zmienia się przy każdym kliknięciu "+", żeby
  // AnimatePresence za każdym razem odpaliło animację "+1" od nowa (patrz JSX niżej), nawet
  // klikane wielokrotnie pod rząd.
  const [quantity, setQuantity] = useState<number | null>(null)
  const [flyUp, setFlyUp] = useState(0)
  const [notes, setNotes] = useState('')
  const [photos, setPhotos] = useState<File[]>(() => (initialPhoto ? [initialPhoto] : []))
  // `initialPhoto` dociera asynchronicznie (odczyt z Cache Storage w MapView, patrz
  // consumeSharedPhoto) - w chwili montowania tego komponentu prop może jeszcze być `null`, więc
  // sam initializer stanu wyżej to za mało. Ten efekt dogania spóźniony plik, tylko raz.
  const addedInitialPhotoRef = useRef(false)
  useEffect(() => {
    if (initialPhoto && !addedInitialPhotoRef.current) {
      addedInitialPhotoRef.current = true
      setPhotos((prev) => [...prev, initialPhoto])
    }
  }, [initialPhoto])
  const [saving, setSaving] = useState(false)
  // Krótki checkmark-moment na przycisku "Zapisz" tuż przed zamknięciem szuflady - potwierdzenie
  // zapisu dotąd żyło wyłącznie w toaście, z dala od miejsca, gdzie kciuk faktycznie nacisnął.
  // `onClose(true)` jest opóźnione o czas animacji (patrz handleSubmit), żeby użytkownik zdążył
  // ją zobaczyć zanim szuflada zacznie się zsuwać.
  const [justSaved, setJustSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Ostrzeżenie o prawdopodobnym duplikacie (ten sam gatunek+grzybowisko w ostatnich 2 minutach,
  // patrz utils/duplicateFindingCheck.ts) - `null` = nie wykryto lub użytkownik już potwierdził
  // "zapisz mimo to" (drugi tap "Zapisz" z tym samym stanem formularza pomija ponowne sprawdzenie).
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null)
  const [duplicateConfirmed, setDuplicateConfirmed] = useState(false)
  const { activeTripId, activeTrip } = useActiveTrip()
  // Ten sam wzorzec i próg co w SpotManager.tsx/StorageInfoDrawer.tsx/ToolsMenu.tsx.
  const isWidePanel = useMediaQuery('(min-width: 1024px)')
  const spots = useLiveQuery(() => db.spots.toArray(), [])
  // Dopisuje rozpoznany tekst do istniejącej notatki (spacją, gdy już coś tam jest) zamiast
  // nadpisywać - grzybiarz w terenie może dyktować w kilku krótkich turach (np. przerywanych
  // zbieraniem), nie jedną długą wypowiedzią.
  const {
    isSupported: speechSupported,
    isListening,
    error: speechError,
    toggleListening,
  } = useSpeechToText((text) => {
    if (!text) return
    setNotes((prev) => (prev.trim() === '' ? text : `${prev} ${text}`))
  })

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    const species = (speciesData as Species[]).find((s) => s.id === speciesId) ?? null
    const resolvedSpotId = spotId === '' ? undefined : spotId

    if (!duplicateConfirmed) {
      const recentFindings = await db.findings.where('createdAt').above(Date.now() - DUPLICATE_WINDOW_MS).toArray()
      if (isLikelyDuplicateFinding({ speciesId: species?.id ?? null, spotId: resolvedSpotId }, recentFindings)) {
        setDuplicateWarning(
          `Podobne znalezisko (${species?.nameCommon}) zostało dodane w ciągu ostatnich 2 minut. Kliknij "Zapisz" ponownie, aby dodać mimo to.`,
        )
        setDuplicateConfirmed(true)
        return
      }
    }

    setSaving(true)
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
          spotId: resolvedSpotId,
          weightGrams: weightGrams.trim() === '' ? undefined : Number(weightGrams),
          quantity: quantity ?? undefined,
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
      rememberLastSpeciesId(species?.id ?? null)
      vibrateSuccess()
      setJustSaved(true)
      setTimeout(() => onClose(true), 380)
      return
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
      showSwipeHandle={!isWidePanel}
      swipeDirection={isWidePanel ? 'right' : 'down'}
      onOpenChange={(open) => {
        if (!open) onClose(false)
      }}
    >
      <DrawerContent className={isWidePanel ? undefined : 'mx-auto max-w-md'}>
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
              onValueChange={(value) => {
                setSpeciesId(value == null || value === NONE_SPECIES ? '' : value)
                setDuplicateWarning(null)
                setDuplicateConfirmed(false)
              }}
            >
              <SelectTrigger autoFocus className="mt-1 w-full">
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
                onValueChange={(value) => {
                  setSpotId(value == null || value === NONE_SPOT ? '' : Number(value))
                  setDuplicateWarning(null)
                  setDuplicateConfirmed(false)
                }}
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

          <div className="block text-sm">
            Liczba sztuk (opcjonalnie)
            {/* Stepper zamiast pola liczbowego z klawiaturą - w terenie, w rękawiczkach, łatwiej
                trafić w duży przycisk +/- niż wpisać cyfrę. Pływające "+1" (nowe.md, pkt o
                mikrointerakcjach przy liczbie znalezisk) to jedyny wizualny sygnał, że kliknięcie
                faktycznie coś zmieniło - stepper sam w sobie jest cichy. */}
            <div className="relative mt-1 flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label="Zmniejsz liczbę sztuk"
                disabled={quantity == null}
                onClick={() => setQuantity((q) => (q == null || q <= 1 ? null : q - 1))}
              >
                <MinusIcon className="size-3.5" />
              </Button>
              <span className="min-w-6 text-center font-medium tabular-nums">{quantity ?? '—'}</span>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label="Zwiększ liczbę sztuk"
                onClick={() => {
                  setQuantity((q) => (q ?? 0) + 1)
                  setFlyUp((n) => n + 1)
                }}
              >
                <PlusIcon className="size-3.5" />
              </Button>
              <AnimatePresence>
                {flyUp > 0 && (
                  <motion.span
                    key={flyUp}
                    initial={{ opacity: 1, y: 0 }}
                    animate={{ opacity: 0, y: -18 }}
                    transition={{ duration: 0.5 }}
                    aria-hidden="true"
                    className="pointer-events-none absolute left-14 text-sm font-semibold text-primary"
                  >
                    +1
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </div>

          <label className="block text-sm">
            <span className="flex items-center justify-between">
              Notatki
              {speechSupported && (
                <button
                  type="button"
                  onClick={toggleListening}
                  aria-label={isListening ? 'Zatrzymaj dyktowanie notatki' : 'Dyktuj notatkę głosowo'}
                  className={`flex size-7 items-center justify-center rounded-full outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 ${
                    isListening
                      ? 'animate-pulse bg-destructive text-destructive-foreground'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <MicIcon className="size-4" />
                </button>
              )}
            </span>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1" rows={3} />
            {speechError && <p className="mt-1 text-sm text-destructive">{speechError}</p>}
          </label>

          {duplicateWarning && (
            <Alert variant="warning">
              <AlertDescription className="text-current">{duplicateWarning}</AlertDescription>
            </Alert>
          )}

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
            <Button type="submit" disabled={saving || justSaved}>
              <AnimatePresence mode="wait" initial={false}>
                {justSaved ? (
                  <motion.span
                    key="saved"
                    className="flex items-center gap-1.5"
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                  >
                    <CheckIcon className="size-4" />
                    Zapisano
                  </motion.span>
                ) : (
                  <motion.span key="label" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    {saving ? 'Zapisywanie...' : 'Zapisz'}
                  </motion.span>
                )}
              </AnimatePresence>
            </Button>
          </div>
        </form>
      </DrawerContent>
    </Drawer>
  )
}
