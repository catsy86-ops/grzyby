import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { toast } from 'sonner'
import { MapPinIcon, TrashIcon } from 'lucide-react'
import { db } from '../../db/db'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { getCurrentPosition } from '../../utils/geolocation'
import { computeSpotStats } from '../../utils/spotStats'
import { formatDate } from '../../utils/formatDate'
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

interface SpotManagerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  // Miejsce do zapisania jako nowe grzybowisko - domyślnie wybrana pinezka na mapie, w jej braku
  // aktualna pozycja GPS użytkownika (patrz `handleSave`).
  pinPosition: [number, number] | null
}

function SpotRow({ spotId, name, notes }: { spotId: number; name: string; notes: string }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const findings = useLiveQuery(() => db.findings.where('spotId').equals(spotId).toArray(), [spotId])
  const stats = computeSpotStats(findings ?? [])

  async function handleDelete() {
    await db.transaction('rw', db.spots, db.findings, async () => {
      // Znaleziska przypisane do usuwanego grzybowiska zostają - tracą tylko powiązanie
      // (spotId), tak samo jak przy usunięciu wyprawy nie usuwa się jej znalezisk.
      await db.findings.where('spotId').equals(spotId).modify({ spotId: undefined })
      await db.spots.delete(spotId)
    })
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
        </div>
        <button
          type="button"
          aria-label={`Usuń grzybowisko: ${name}`}
          onClick={() => setConfirmDelete(true)}
          className="shrink-0 rounded p-1 text-muted-foreground outline-none hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <TrashIcon className="size-4" />
        </button>
      </CardContent>

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

export function SpotManager({ open, onOpenChange, pinPosition }: SpotManagerProps) {
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
              <SpotRow key={spot.id} spotId={spot.id!} name={spot.name} notes={spot.notes} />
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
