import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  CalendarClockIcon,
  CalendarPlusIcon,
  CheckIcon,
  ChevronDownIcon,
  CloudRainIcon,
  ExternalLinkIcon,
  MapPinIcon,
  MergeIcon,
  NavigationIcon,
  SparklesIcon,
  TrashIcon,
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { EmptyBasketIllustration } from '../../components/icons/illustrations'
import { db } from '../../db/db'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { useSpotMushroomOutlook } from '../../hooks/useSpotMushroomOutlook'
import { getCurrentPosition } from '../../utils/geolocation'
import { downloadBlob } from '../../utils/exportImport'
import { buildSpotRevisitIcs } from '../../utils/icsExport'
import { buildGoogleMapsUrl } from '../../utils/mapsLink'
import { computeSpotStats } from '../../utils/spotStats'
import { rankSpotsBySeasonality } from '../../utils/spotRanking'
import { formatDate } from '../../utils/formatDate'
import { MONTH_NAMES, monthLabel, nextRevisitDate } from '../../utils/spotRevisit'
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '../../components/ui/dialog'
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '../../components/ui/drawer'
import { Input } from '../../components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import type { Spot } from '../../db/schema'

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

const NONE_MERGE_TARGET = '__none__'

function SpotRow({
  spotId,
  name,
  notes,
  latitude,
  longitude,
  revisitMonth,
  revisitFlaggedAt,
  otherSpots,
  isNavigationTarget,
  onToggleNavigationTarget,
}: {
  spotId: number
  name: string
  notes: string
  latitude: number
  longitude: number
  revisitMonth: number | undefined
  revisitFlaggedAt: number | undefined
  otherSpots: Spot[]
  isNavigationTarget: boolean
  onToggleNavigationTarget: () => void
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [outlookExpanded, setOutlookExpanded] = useState(false)
  const [revisitPickerOpen, setRevisitPickerOpen] = useState(false)
  const [mergeOpen, setMergeOpen] = useState(false)
  const [mergeTargetId, setMergeTargetId] = useState('')

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

  function handleDownloadIcs() {
    if (revisitMonth == null || revisitFlaggedAt == null) return
    const date = nextRevisitDate(revisitMonth, revisitFlaggedAt)
    const ics = buildSpotRevisitIcs(name, date)
    downloadBlob(
      new Blob([ics], { type: 'text/calendar;charset=utf-8' }),
      `grzybowisko-${name.replace(/\s+/g, '-').toLowerCase()}.ics`,
    )
  }

  async function handleMerge() {
    const targetId = Number(mergeTargetId)
    if (!targetId) return
    // Znaleziska przypisane do scalanego grzybowiska przechodzą pod docelowe - inaczej niż przy
    // zwykłym usunięciu, to NIE jest utrata powiązania, tylko jego przeniesienie (dwa wpisy dla
    // tego samego, fizycznie jednego miejsca, są teraz jednym spotem z pełną historią).
    await db.transaction('rw', db.spots, db.findings, async () => {
      await db.findings.where('spotId').equals(spotId).modify({ spotId: targetId })
      await db.spots.delete(spotId)
    })
    if (isNavigationTarget) onToggleNavigationTarget()
    setMergeOpen(false)
    setMergeTargetId('')
  }

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
          <a
            href={buildGoogleMapsUrl(latitude, longitude)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Otwórz w Mapach: ${name}`}
            className="rounded p-1 text-muted-foreground outline-none transition-transform hover:text-primary focus-visible:ring-2 focus-visible:ring-ring/50 active:translate-y-px"
          >
            <ExternalLinkIcon className="size-4" />
          </a>
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
          {revisitMonth != null && revisitFlaggedAt != null && (
            <button
              type="button"
              aria-label={`Dodaj przypomnienie do kalendarza: ${name}`}
              onClick={handleDownloadIcs}
              className="rounded p-1 text-muted-foreground outline-none transition-transform hover:text-primary focus-visible:ring-2 focus-visible:ring-ring/50 active:translate-y-px"
            >
              <CalendarPlusIcon className="size-4" />
            </button>
          )}
          {otherSpots.length > 0 && (
            <button
              type="button"
              aria-label={`Scal grzybowisko: ${name}`}
              onClick={() => setMergeOpen(true)}
              className="rounded p-1 text-muted-foreground outline-none transition-transform hover:text-primary focus-visible:ring-2 focus-visible:ring-ring/50 active:translate-y-px"
            >
              <MergeIcon className="size-4" />
            </button>
          )}
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
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant={outlook.score === 'dobry' ? 'secondary' : 'outline'}
                className="gap-1.5 px-2.5 py-1 text-xs"
              >
                <CloudRainIcon className="size-3.5" />
                {outlook.label}
              </Badge>
              {outlook.soilMoisturePercent != null && (
                <span className="text-xs text-muted-foreground">
                  Wilgotność gleby: ~{Math.round(outlook.soilMoisturePercent)}%
                </span>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              {isOutlookLoading ? 'Sprawdzanie prognozy…' : 'Prognoza niedostępna (brak sieci lub danych).'}
            </p>
          )}
        </CardContent>
      )}

      <Dialog
        open={mergeOpen}
        onOpenChange={(open) => {
          setMergeOpen(open)
          if (!open) setMergeTargetId('')
        }}
      >
        <DialogContent>
          <DialogTitle>Scal "{name}" z innym grzybowiskiem</DialogTitle>
          <DialogDescription>
            Znaleziska przypisane do "{name}" zostaną przeniesione do wybranego grzybowiska, a "{name}" zostanie
            usunięte. Tej operacji nie można cofnąć.
          </DialogDescription>
          <Select
            value={mergeTargetId || NONE_MERGE_TARGET}
            onValueChange={(value) => setMergeTargetId(value == null || value === NONE_MERGE_TARGET ? '' : value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE_MERGE_TARGET}>-- wybierz grzybowisko --</SelectItem>
              {otherSpots.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setMergeOpen(false)}>
              Anuluj
            </Button>
            <Button disabled={!mergeTargetId} onClick={handleMerge}>
              Scal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
  // Krótki checkmark-moment na przycisku, ten sam wzorzec co "Zapisz" w AddFindingForm.tsx -
  // szuflada tu nie zamyka się po zapisie (formularz zostaje na kolejne grzybowisko), więc bez
  // tego jedynym potwierdzeniem był toast z dala od miejsca, gdzie kciuk faktycznie nacisnął.
  const [justSaved, setJustSaved] = useState(false)
  const spots = useLiveQuery(() => db.spots.orderBy('createdAt').reverse().toArray(), [])
  // Ranking sezonowy jest czysto lokalny (patrz spotRanking.ts) - liczony dla wszystkich spotów
  // naraz jest tani, w przeciwieństwie do prognozy pogody per spot (celowo leniwej, żeby nie
  // pruć darmowego limitu Open-Meteo).
  const allFindings = useLiveQuery(() => db.findings.toArray(), [])
  const rankedSpots = useMemo(
    () => rankSpotsBySeasonality(spots ?? [], allFindings ?? []).slice(0, 3),
    [spots, allFindings],
  )
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
      setJustSaved(true)
      setTimeout(() => setJustSaved(false), 900)
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
          {rankedSpots.length > 0 && (
            <div className="flex flex-col gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
              <p className="flex items-center gap-1.5 text-xs font-medium text-primary">
                <SparklesIcon className="size-3.5" />
                Dziś warto sprawdzić
              </p>
              {rankedSpots.map(({ spot, matchCount }) => (
                <div key={spot.id} className="flex items-center justify-between gap-2 text-sm">
                  <span>
                    {spot.name}{' '}
                    <span className="text-xs text-muted-foreground">
                      ({matchCount}× w tym miesiącu w poprzednich latach)
                    </span>
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0"
                    onClick={() =>
                      onSetNavigationTargetSpotId(navigationTargetSpotId === spot.id ? null : spot.id!)
                    }
                  >
                    {navigationTargetSpotId === spot.id ? 'Nawiguję' : 'Nawiguj'}
                  </Button>
                </div>
              ))}
            </div>
          )}
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
            <Button size="sm" disabled={!name.trim() || saving || justSaved} onClick={handleSave}>
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
                    {saving ? 'Zapisywanie...' : 'Zapisz grzybowisko'}
                  </motion.span>
                )}
              </AnimatePresence>
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
                revisitFlaggedAt={spot.revisitFlaggedAt}
                otherSpots={(spots ?? []).filter((s) => s.id !== spot.id)}
                isNavigationTarget={navigationTargetSpotId === spot.id}
                onToggleNavigationTarget={() =>
                  onSetNavigationTargetSpotId(navigationTargetSpotId === spot.id ? null : spot.id!)
                }
              />
            ))}
            {spots?.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col items-center gap-2 py-6 text-center text-muted-foreground"
              >
                <EmptyBasketIllustration className="size-12 text-muted-foreground" />
                <p className="text-sm">Brak zapisanych grzybowisk.</p>
              </motion.div>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
