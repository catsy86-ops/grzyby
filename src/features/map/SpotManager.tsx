import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { toast } from 'sonner'
import { CalendarClockIcon, ChevronDownIcon, CloudRainIcon, MapPinIcon, NavigationIcon, TrashIcon } from 'lucide-react'
import { db } from '../../db/db'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { useSpotMushroomOutlook } from '../../hooks/useSpotMushroomOutlook'
import { getCurrentPosition } from '../../utils/geolocation'
import { computeSpotStats } from '../../utils/spotStats'
import { formatDate } from '../../utils/formatDate'
import { MONTH_NAMES, monthLabel } from '../../utils/spotRevisit'
import { Badge } from '../../components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog'
import { Button } from '../../components/ui/button'
import { Card, CardContent } from '../../components/ui/card'
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '../../components/ui/drawer'
import { Input } from '../../components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'

interface SpotManagerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  // Miejsce do zapisania jako nowe grzybowisko - domyślnie wybrana pinezka na mapie, w jej braku
  // aktualna pozycja GPS użytkownika (patrz `handleSave`).
  pinPosition: [number, number] | null
  navigationTargetSpotId: number | null
  onSetNavigationTargetSpotId: (id: number | null) => void
}

const NONE_MONTH = '__none__'

function SpotRow({
  spotId,
  name,
  notes,
  latitude,
  longitude,
  revisitMonth,
  isNavigationTarget,
  onToggleNavigationTarget,
}: {
  spotId: number
  name: string
  notes: string
  latitude: number
  longitude: number
  revisitMonth: number | undefined
  isNavigationTarget: boolean
  onToggleNavigationTarget: () => void
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [outlookExpanded, setOutlookExpanded] = useState(false)
  const [revisitPickerOpen, setRevisitPickerOpen] = useState(false)

  async function handleChangeRevisitMonth(value: string | null) {
    if (value == null || value === NONE_MONTH) {
      await db.spots.update(spotId, { revisitMonth: undefined, revisitFlaggedAt: undefined })
    } else {
      await db.spots.update(spotId, { revisitMonth: Number(value), revisitFlaggedAt: Date.now() })
    }
  }
  const findings = useLiveQuery(() => db.findings.where('spotId').equals(spotId).toArray(), [spotId])
  const stats = computeSpotStats(findings ?? [])
  const { outlook, isLoading: isOutlookLoading } = useSpotMushroomOutlook(
    spotId,
    latitude,
    longitude,
    outlookExpanded,
  )

  async function handleDelete() {
    await db.transaction('rw', db.spots, db.findings, async () => {
      // Znaleziska przypisane do usuwanego grzybowiska zostają - tracą tylko powiązanie
      // (spotId), tak samo jak przy usunięciu wyprawy nie usuwa się jej znalezisk.
      await db.findings.where('spotId').equals(spotId).modify({ spotId: undefined })
      await db.spots.delete(spotId)
    })
    if (isNavigationTarget) onToggleNavigationTarget()
    setConfirmDelete(false)
  }

  return (
    <Card size="sm">
      <CardContent className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium">{name}</p>
          {notes && <p className="text-xs text-foreground/70">{notes}</p>}
          <p className="mt-1 text-xs text-muted-foreground">
            {stats.findingCount} {stats.findingCount === 1 ? 'znalezisko' : 'znalezisk'}
            {stats.speciesDiversity > 0 && ` · ${stats.speciesDiversity} gatunków`}
            {stats.lastVisitAt != null && ` · ostatnio ${formatDate(stats.lastVisitAt)}`}
          </p>
          {revisitMonth != null && (
            <Badge variant="outline" className="mt-1.5 gap-1 text-[11px]">
              <CalendarClockIcon className="size-3" />
              Sprawdzić: {monthLabel(revisitMonth)}
            </Badge>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            aria-label={isNavigationTarget ? `Zakończ nawigację do: ${name}` : `Nawiguj do: ${name}`}
            aria-pressed={isNavigationTarget}
            onClick={onToggleNavigationTarget}
            className={`rounded p-1 outline-none transition-transform focus-visible:ring-2 focus-visible:ring-ring/50 active:translate-y-px ${
              isNavigationTarget ? 'text-primary' : 'text-muted-foreground hover:text-primary'
            }`}
          >
            <NavigationIcon className="size-4" />
          </button>
          <button
            type="button"
            aria-label={
              revisitPickerOpen ? `Ukryj wybór miesiąca sprawdzenia: ${name}` : `Oznacz do sprawdzenia w sezonie: ${name}`
            }
            aria-expanded={revisitPickerOpen}
            onClick={() => setRevisitPickerOpen((v) => !v)}
            className={`rounded p-1 outline-none transition-transform focus-visible:ring-2 focus-visible:ring-ring/50 active:translate-y-px ${
              revisitMonth != null ? 'text-primary' : 'text-muted-foreground hover:text-primary'
            }`}
          >
            <CalendarClockIcon className="size-4" />
          </button>
          <button
            type="button"
            aria-label={`Usuń grzybowisko: ${name}`}
            onClick={() => setConfirmDelete(true)}
            className="rounded p-1 text-muted-foreground outline-none transition-transform hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring/50 active:translate-y-px"
          >
            <TrashIcon className="size-4" />
          </button>
          <button
            type="button"
            aria-label={outlookExpanded ? `Ukryj prognozę grzybową: ${name}` : `Pokaż prognozę grzybową: ${name}`}
            aria-expanded={outlookExpanded}
            onClick={() => setOutlookExpanded((v) => !v)}
            className="rounded p-1 text-muted-foreground outline-none transition-transform hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 active:translate-y-px"
          >
            <ChevronDownIcon className={`size-4 transition-transform ${outlookExpanded ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </CardContent>

      {revisitPickerOpen && (
        <CardContent className="flex items-center gap-2 pt-0">
          <p className="shrink-0 text-xs text-muted-foreground">Sprawdzić ponownie w:</p>
          <Select value={revisitMonth != null ? String(revisitMonth) : NONE_MONTH} onValueChange={handleChangeRevisitMonth}>
            <SelectTrigger className="h-8 flex-1 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE_MONTH}>-- brak flagi --</SelectItem>
              {MONTH_NAMES.map((label, index) => (
                <SelectItem key={label} value={String(index + 1)}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      )}

      {outlookExpanded && (
        <CardContent className="pt-0">
          {outlook ? (
            <Badge
              variant={outlook.score === 'dobry' ? 'secondary' : 'outline'}
              className="gap-1.5 px-2.5 py-1 text-xs"
            >
              <CloudRainIcon className="size-3.5" />
              {outlook.label}
            </Badge>
          ) : (
            <p className="text-xs text-muted-foreground">
              {isOutlookLoading ? 'Sprawdzanie prognozy…' : 'Prognoza niedostępna (brak sieci lub danych).'}
            </p>
          )}
        </CardContent>
      )}

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogTitle>Usunąć grzybowisko "{name}"?</AlertDialogTitle>
          <AlertDialogDescription>
            Znaleziska przypisane do tego miejsca zostaną zachowane w dzienniku, tylko stracą powiązanie z
            grzybowiskiem.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-white hover:bg-destructive/90" onClick={handleDelete}>
              Usuń
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}

export function SpotManager({
  open,
  onOpenChange,
  pinPosition,
  navigationTargetSpotId,
  onSetNavigationTargetSpotId,
}: SpotManagerProps) {
  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const spots = useLiveQuery(() => db.spots.orderBy('createdAt').reverse().toArray(), [])
  // Na szerokim ekranie (lg:+) szuflada wysuwa się z prawej jako stały panel boczny zamiast
  // arkusza z dołu - na desktopie jest dość miejsca, żeby nie zasłaniać mapy pod spodem, a
  // panel z boku czyta się bardziej jak "narzędzie obok mapy" niż modal najeżdżający na widok.
  const isWidePanel = useMediaQuery('(min-width: 1024px)')
  const swipeDirection = isWidePanel ? 'right' : 'down'

  async function handleSave() {
    const trimmedName = name.trim()
    if (!trimmedName) return
    setSaving(true)
    try {
      let position: [number, number]
      if (pinPosition) {
        position = pinPosition
      } else {
        const coords = await getCurrentPosition()
        position = [coords.latitude, coords.longitude]
      }
      await db.spots.add({
        name: trimmedName,
        latitude: position[0],
        longitude: position[1],
        notes: notes.trim(),
        createdAt: Date.now(),
      })
      setName('')
      setNotes('')
      toast.success(`Zapisano grzybowisko: ${trimmedName}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Nie udało się zapisać grzybowiska.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Drawer open={open} showSwipeHandle swipeDirection={swipeDirection} onOpenChange={onOpenChange}>
      <DrawerContent className={swipeDirection === 'down' ? 'mx-auto max-w-md' : undefined}>
        <DrawerHeader>
          <DrawerTitle>Grzybowiska</DrawerTitle>
          <DrawerDescription>
            Nazwane, zapisane miejsca do których wracasz - historia zbiorów w każdym z nich zbiera się
            automatycznie, gdy dodajesz znalezisko w tym miejscu.
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex flex-col gap-3 px-4 pb-4">
          <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPinIcon className="size-3.5" />
              {pinPosition ? 'Zapisze wybraną na mapie pinezkę' : 'Zapisze Twoją obecną pozycję GPS'}
            </p>
            <Input
              type="text"
              placeholder="Nazwa grzybowiska (np. Sosnowy zagajnik za rzeką)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input type="text" placeholder="Notatki (opcjonalnie)" value={notes} onChange={(e) => setNotes(e.target.value)} />
            <Button size="sm" disabled={!name.trim() || saving} onClick={handleSave}>
              {saving ? 'Zapisywanie...' : 'Zapisz grzybowisko'}
            </Button>
          </div>

          <div className="flex flex-col gap-2">
            {spots?.map((spot) => (
              <SpotRow
                key={spot.id}
                spotId={spot.id!}
                name={spot.name}
                notes={spot.notes}
                latitude={spot.latitude}
                longitude={spot.longitude}
                revisitMonth={spot.revisitMonth}
                isNavigationTarget={navigationTargetSpotId === spot.id}
                onToggleNavigationTarget={() =>
                  onSetNavigationTargetSpotId(navigationTargetSpotId === spot.id ? null : spot.id!)
                }
              />
            ))}
            {spots?.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">Brak zapisanych grzybowisk.</p>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
