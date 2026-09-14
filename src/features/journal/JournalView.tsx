import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useRef, useState } from 'react'
import { useAutoAnimate } from '@formkit/auto-animate/react'
import { motion } from 'motion/react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { toast } from 'sonner'
import { NotebookTextIcon } from 'lucide-react'
import { db } from '../../db/db'
import speciesData from '../../data/species.json'
import type { Finding, Species } from '../../db/schema'
import { downloadBlob, exportData, importData } from '../../utils/exportImport'
import { getCurrentPosition } from '../../utils/geolocation'
import { compressPhoto, createThumbnail } from '../../utils/imageUtils'
import { findOverlappingConsumedFindings } from '../../utils/reactionTracking'
import { countSpeciesDiversity, formatDuration } from '../../utils/tripStats'
import { Alert, AlertTitle, AlertDescription } from '../../components/ui/alert'
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
import { Input } from '../../components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Skeleton } from '../../components/ui/skeleton'
import { Textarea } from '../../components/ui/textarea'
import { NotificationPermissionBanner } from '../../components/NotificationPermissionBanner'
import { ConsumptionTracker } from './ConsumptionTracker'
import { FindingThumbnail } from './FindingThumbnail'
import { TripManager } from './TripManager'
import { TripsHistory } from './TripsHistory'

type TripFilter = number | 'wszystkie' | 'bez-wyprawy'
const NONE_SPECIES = '__none__'

export function JournalView() {
  const findings = useLiveQuery(() => db.findings.orderBy('createdAt').reverse().toArray(), [])
  const [tripFilter, setTripFilter] = useState<TripFilter>('wszystkie')
  const [searchQuery, setSearchQuery] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editSpeciesId, setEditSpeciesId] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editLatitude, setEditLatitude] = useState<number | null>(null)
  const [editLongitude, setEditLongitude] = useState<number | null>(null)
  const [editPhoto, setEditPhoto] = useState<File | null>(null)
  const [editRemovePhoto, setEditRemovePhoto] = useState(false)
  const [editLocating, setEditLocating] = useState(false)
  const [editSaving, setEditSaving] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [listRef] = useAutoAnimate()

  const editingPhoto = useLiveQuery(
    async () => (editingId != null ? ((await db.photos.where('findingId').equals(editingId).first()) ?? null) : null),
    [editingId],
  )

  const selectedTrip = useLiveQuery(
    () => (typeof tripFilter === 'number' ? db.trips.get(tripFilter) : undefined),
    [tripFilter],
  )

  const filteredFindings = useMemo(() => {
    if (!findings) return findings
    let result = findings
    if (tripFilter === 'bez-wyprawy') result = result.filter((f) => f.tripId == null)
    else if (tripFilter !== 'wszystkie') result = result.filter((f) => f.tripId === tripFilter)
    const query = searchQuery.trim().toLowerCase()
    if (query) {
      result = result.filter(
        (f) =>
          (f.speciesNameGuess?.toLowerCase().includes(query) ?? false) ||
          f.notes.toLowerCase().includes(query),
      )
    }
    return result
  }, [findings, tripFilter, searchQuery])

  const confirmDeleteFinding = useMemo(
    () => (confirmDeleteId != null ? findings?.find((f) => f.id === confirmDeleteId) : undefined),
    [findings, confirmDeleteId],
  )

  // Ostrzeżenie, gdy jakiekolwiek spożyte znalezisko zgłosiło ciężką reakcję - pomaga
  // szybko znaleźć powiązane znaleziska zjedzone w tym samym oknie czasowym (zatrucia
  // grzybami z opóźnionym działaniem toksyn ujawniają się nawet po ~24h).
  const severeReactionFindings = useMemo(
    () => (findings ?? []).filter((f) => f.consumed && f.reactionSeverity === 'ciężka'),
    [findings],
  )

  const chartData = useMemo(() => {
    if (!filteredFindings) return []
    const counts = new Map<string, number>()
    for (const finding of filteredFindings) {
      const species = (speciesData as Species[]).find((s) => s.id === finding.speciesId)
      const label = species?.nameCommon ?? 'Nieokreślony'
      counts.set(label, (counts.get(label) ?? 0) + 1)
    }
    return Array.from(counts.entries()).map(([name, count]) => ({ name, count }))
  }, [filteredFindings])

  async function handleExport() {
    const blob = await exportData()
    downloadBlob(blob, `lysy-dziennik-${new Date().toISOString().slice(0, 10)}.json`)
  }

  async function handleImportFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const result = await importData(file)
      toast.success(`Zaimportowano ${result.findingsImported} znalezisk i ${result.tripsImported} wypraw.`)
    } catch (err) {
      toast.error(err instanceof Error ? `Błąd importu: ${err.message}` : 'Błąd importu pliku')
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleDelete(id: number) {
    await db.transaction('rw', db.findings, db.photos, async () => {
      await db.photos.where('findingId').equals(id).delete()
      await db.findings.delete(id)
    })
    setConfirmDeleteId(null)
  }

  function handleStartEdit(finding: Finding) {
    setEditingId(finding.id ?? null)
    setEditSpeciesId(finding.speciesId ?? '')
    setEditNotes(finding.notes)
    setEditLatitude(finding.latitude)
    setEditLongitude(finding.longitude)
    setEditPhoto(null)
    setEditRemovePhoto(false)
  }

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

  async function handleSaveEdit(id: number) {
    setEditSaving(true)
    try {
      const species = (speciesData as Species[]).find((s) => s.id === editSpeciesId) ?? null
      // Kompresja zdjęcia musi zajść PRZED transakcją Dexie - operacje asynchroniczne spoza API
      // Dexie w środku transakcji przedwcześnie ją zamykają (patrz utils/exportImport.ts).
      const newPhoto = editPhoto
        ? await Promise.all([compressPhoto(editPhoto), createThumbnail(editPhoto)]).then(([blob, thumbnailBlob]) => ({
            blob,
            thumbnailBlob,
          }))
        : null

      await db.transaction('rw', db.findings, db.photos, async () => {
        await db.findings.update(id, {
          speciesId: species?.id ?? null,
          speciesNameGuess: species?.nameCommon ?? null,
          notes: editNotes,
          latitude: editLatitude,
          longitude: editLongitude,
        })
        if (newPhoto) {
          await db.photos.where('findingId').equals(id).delete()
          await db.photos.add({ findingId: id, blob: newPhoto.blob, thumbnailBlob: newPhoto.thumbnailBlob })
        } else if (editRemovePhoto) {
          await db.photos.where('findingId').equals(id).delete()
        }
      })
      setEditingId(null)
    } catch (err) {
      const errorName = err != null && typeof err === 'object' && 'name' in err ? (err as { name: unknown }).name : undefined
      toast.error(
        errorName === 'QuotaExceededError'
          ? 'Brak miejsca na urządzeniu - zwolnij pamięć (np. w "Pamięć i dane") i spróbuj ponownie.'
          : 'Nie udało się zapisać zmian. Spróbuj ponownie.',
      )
    } finally {
      setEditSaving(false)
    }
  }

  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col gap-4 overflow-y-auto p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Dziennik zbiorów</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-primary text-primary hover:bg-primary/10"
            onClick={handleExport}
          >
            Eksportuj
          </Button>
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
            Importuj
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            onChange={handleImportFile}
            className="hidden"
          />
        </div>
      </div>

      <NotificationPermissionBanner />

      {severeReactionFindings.length > 0 && (
        <Alert variant="destructive-soft" className="border-red-400">
          <AlertTitle>⚠️ Zgłoszono ciężką reakcję po spożyciu</AlertTitle>
          <AlertDescription className="text-current">
            <p>
              Jeśli objawy są poważne (wymioty, biegunka, zaburzenia widzenia, żółtaczka), niezwłocznie
              skontaktuj się z Centrum Ostrych Zatruć lub zadzwoń pod 112. Zabierz ze sobą resztki grzybów
              i to znalezisko z dziennika jako informację dla lekarza.
            </p>
            <ul className="mt-1 list-inside list-disc text-xs">
              {severeReactionFindings.map((f) => {
                const overlapping = findOverlappingConsumedFindings(f, findings ?? [])
                return (
                  <li key={f.id}>
                    {f.speciesNameGuess ?? 'Nieokreślony gatunek'} —{' '}
                    {f.consumedAt ? new Date(f.consumedAt).toLocaleString('pl-PL') : ''}
                    {overlapping.length > 0 && ` (inne zjedzone w tym czasie: ${overlapping.length})`}
                  </li>
                )
              })}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <Input
        type="search"
        placeholder="Szukaj po gatunku lub notatkach..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />

      <TripManager />
      <TripsHistory selectedTripId={tripFilter} onSelectTrip={setTripFilter} />

      {selectedTrip && filteredFindings && (
        <Card size="sm" className="bg-muted/50">
          <CardContent>
            <p className="text-sm font-medium">{selectedTrip.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {new Date(selectedTrip.startedAt).toLocaleString('pl-PL')}
              {selectedTrip.endedAt != null && ` – ${new Date(selectedTrip.endedAt).toLocaleString('pl-PL')}`}
              {' · '}
              {formatDuration(selectedTrip.startedAt, selectedTrip.endedAt)} ·{' '}
              {filteredFindings.length} znalezisk · {countSpeciesDiversity(filteredFindings)} gatunków
            </p>
          </CardContent>
        </Card>
      )}

      {chartData.length > 0 && (
        <div className="h-56 rounded border border-border p-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {filteredFindings === undefined && (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      )}

      <div ref={listRef} className="flex flex-col gap-3">
        {filteredFindings?.map((finding) => {
          if (finding.id != null && editingId === finding.id) {
            return (
              <Card key={finding.id} size="sm" className="ring-green-300">
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
                    <Textarea
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      className="mt-1"
                      rows={2}
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
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={editLocating}
                        onClick={handleUseCurrentLocation}
                      >
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
                  {!editPhoto && editingPhoto && !editRemovePhoto && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-fit text-red-600"
                      onClick={() => setEditRemovePhoto(true)}
                    >
                      Usuń obecne zdjęcie
                    </Button>
                  )}
                  {editRemovePhoto && <p className="text-xs text-muted-foreground">Zdjęcie zostanie usunięte po zapisaniu.</p>}

                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                      Anuluj
                    </Button>
                    <Button size="sm" disabled={editSaving} onClick={() => handleSaveEdit(finding.id!)}>
                      {editSaving ? 'Zapisywanie...' : 'Zapisz'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          }

          return (
            <Card key={finding.id} size="sm">
              <CardContent className="flex items-start gap-3">
                {finding.id != null && <FindingThumbnail findingId={finding.id} />}
                <div className="flex flex-1 items-start justify-between">
                  <div>
                    <p className="font-medium">{finding.speciesNameGuess ?? 'Nieokreślony gatunek'}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(finding.createdAt).toLocaleString('pl-PL')}
                      {finding.latitude != null && finding.longitude != null && (
                        <>
                          {' '}
                          · {finding.latitude.toFixed(4)}, {finding.longitude.toFixed(4)}
                        </>
                      )}
                    </p>
                    {finding.notes && <p className="mt-1 text-sm text-foreground/80">{finding.notes}</p>}
                    <ConsumptionTracker finding={finding} />
                  </div>
                  <div className="flex shrink-0 gap-2 text-xs">
                    <button onClick={() => handleStartEdit(finding)} className="text-muted-foreground hover:underline">
                      Edytuj
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(finding.id ?? null)}
                      className="text-red-600 hover:underline"
                    >
                      Usuń
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
        {filteredFindings?.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground"
          >
            <NotebookTextIcon className="size-8" />
            <p className="text-sm">Brak zapisanych znalezisk dla wybranego filtru.</p>
          </motion.div>
        )}
      </div>

      <AlertDialog
        open={confirmDeleteId != null}
        onOpenChange={(open) => {
          if (!open) setConfirmDeleteId(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogTitle>Usunąć znalezisko?</AlertDialogTitle>
          <AlertDialogDescription>
            {confirmDeleteFinding?.speciesNameGuess ?? 'To znalezisko'} zostanie trwale usunięte razem ze
            zdjęciem. Tej operacji nie można cofnąć.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={() => confirmDeleteId != null && handleDelete(confirmDeleteId)}
            >
              Tak, usuń
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
