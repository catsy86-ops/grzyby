import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useRef, useState } from 'react'
import { useAutoAnimate } from '@formkit/auto-animate/react'
import { motion } from 'motion/react'
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { toast } from 'sonner'
import { DownloadIcon, FileTextIcon, MapIcon, MoreVerticalIcon, UploadIcon } from 'lucide-react'
import { EmptyBasketIllustration } from '../../components/icons/illustrations'
import { db } from '../../db/db'
import speciesData from '../../data/species.json'
import type { Finding, Species } from '../../db/schema'
import { EdibilityBadge, edibilityCardAccentClass, edibilityChartColor } from '../../components/EdibilityBadge'
import { StatTile, StatTileRow } from '../../components/StatTiles'
import {
  countLikelyDuplicates,
  downloadBlob,
  exportData,
  importPayload,
  readExportFile,
  type ExportPayload,
} from '../../utils/exportImport'
import { getCurrentPosition } from '../../utils/geolocation'
import { compressPhoto, createThumbnail } from '../../utils/imageUtils'
import { exportFindingsToPdf } from '../../utils/pdfExport'
import { exportFindingsToGpx } from '../../utils/gpxExport'
import { findOverlappingConsumedFindings } from '../../utils/reactionTracking'
import { countSpeciesDiversity, formatDuration, formatWeight, sumWeightGrams } from '../../utils/tripStats'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu'
import { Input } from '../../components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Skeleton } from '../../components/ui/skeleton'
import { Textarea } from '../../components/ui/textarea'
import { FirstAidGuide } from '../tools/FirstAidGuide'
import { NotificationPermissionBanner } from '../../components/NotificationPermissionBanner'
import { ConsumptionTracker } from './ConsumptionTracker'
import { FindingThumbnail } from './FindingThumbnail'
import { SeasonSummary } from './SeasonSummary'
import { TripManager } from './TripManager'
import { TripsHistory } from './TripsHistory'
import { formatDateTime } from '../../utils/formatDate'
import { shareFinding } from '../../utils/shareFinding'

type TripFilter = number | 'wszystkie' | 'bez-wyprawy'
const NONE_SPECIES = '__none__'
// Strona listy znalezisk - bez tego `db.findings.toArray()` ładowałby całą historię do pamięci
// przy każdej zmianie (useLiveQuery), co przy wieloletnim dzienniku zbiorów niepotrzebnie rośnie.
// Ostrzeżenie o ciężkich reakcjach (patrz `severeReactionFindings` niżej) celowo NIE jest objęte
// tym limitem - to alert bezpieczeństwa i musi widzieć całą historię, nie tylko najnowszą stronę.
const PAGE_SIZE = 100

export function JournalView() {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const pageQueryResult = useLiveQuery(
    () => db.findings.orderBy('createdAt').reverse().limit(visibleCount + 1).toArray(),
    [visibleCount],
  )
  const hasMoreFindings = (pageQueryResult?.length ?? 0) > visibleCount
  const findings = pageQueryResult && (hasMoreFindings ? pageQueryResult.slice(0, visibleCount) : pageQueryResult)

  // Zapytanie niezależne od paginacji listy - ostrzeżenie o zatruciu musi obejmować całą historię.
  const severeReactionCandidates = useLiveQuery(
    () => db.findings.where('reactionSeverity').equals('ciężka').toArray(),
    [],
  )
  const consumedFindings = useLiveQuery(() => db.findings.filter((f) => f.consumed === true).toArray(), [])

  const [tripFilter, setTripFilter] = useState<TripFilter>('wszystkie')
  const [searchQuery, setSearchQuery] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editSpeciesId, setEditSpeciesId] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editWeightGrams, setEditWeightGrams] = useState('')
  const [editLatitude, setEditLatitude] = useState<number | null>(null)
  const [editLongitude, setEditLongitude] = useState<number | null>(null)
  const [editPhoto, setEditPhoto] = useState<File | null>(null)
  const [editRemovePhoto, setEditRemovePhoto] = useState(false)
  const [editLocating, setEditLocating] = useState(false)
  const [editSaving, setEditSaving] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [pendingImport, setPendingImport] = useState<{ payload: ExportPayload; duplicateCount: number } | null>(null)
  const [showFirstAid, setShowFirstAid] = useState(false)
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
    () => (severeReactionCandidates ?? []).filter((f) => f.consumed),
    [severeReactionCandidates],
  )

  const chartData = useMemo(() => {
    if (!filteredFindings) return []
    const counts = new Map<string, { count: number; edibility: Species['edibility'] | undefined }>()
    for (const finding of filteredFindings) {
      const species = (speciesData as Species[]).find((s) => s.id === finding.speciesId)
      const label = species?.nameCommon ?? 'Nieokreślony'
      const existing = counts.get(label)
      counts.set(label, { count: (existing?.count ?? 0) + 1, edibility: species?.edibility })
    }
    return Array.from(counts.entries()).map(([name, { count, edibility }]) => ({ name, count, edibility }))
  }, [filteredFindings])

  async function handleExport() {
    const blob = await exportData()
    downloadBlob(blob, `lysy-dziennik-${new Date().toISOString().slice(0, 10)}.json`)
  }

  async function handleExportPdf() {
    if (!filteredFindings) return
    const blob = await exportFindingsToPdf(filteredFindings, {
      title: selectedTrip ? selectedTrip.name : 'Dziennik zbiorów',
      subtitle: searchQuery.trim() ? `Filtr: "${searchQuery.trim()}"` : undefined,
      tripInfo: selectedTrip ? { startedAt: selectedTrip.startedAt, endedAt: selectedTrip.endedAt } : undefined,
    })
    downloadBlob(blob, `lysy-${selectedTrip ? selectedTrip.name.replace(/\s+/g, '-').toLowerCase() : 'dziennik'}-${new Date().toISOString().slice(0, 10)}.pdf`)
  }

  function handleExportGpx() {
    if (!filteredFindings) return
    const blob = exportFindingsToGpx(filteredFindings)
    downloadBlob(blob, `lysy-${selectedTrip ? selectedTrip.name.replace(/\s+/g, '-').toLowerCase() : 'dziennik'}-${new Date().toISOString().slice(0, 10)}.gpx`)
  }

  async function finishImport(payload: ExportPayload) {
    try {
      const result = await importPayload(payload)
      toast.success(`Zaimportowano ${result.findingsImported} znalezisk i ${result.tripsImported} wypraw.`)
    } catch (err) {
      toast.error(err instanceof Error ? `Błąd importu: ${err.message}` : 'Błąd importu pliku')
    }
  }

  async function handleImportFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const payload = await readExportFile(file)
      // Wykrywanie ponownego importu tego samego pliku - np. użytkownik kliknął "Importuj" dwa
      // razy albo pomylił plik. Nie blokujemy importu, tylko prosimy o potwierdzenie.
      const duplicateCount = countLikelyDuplicates(payload, findings ?? [])
      if (duplicateCount > 0) {
        setPendingImport({ payload, duplicateCount })
      } else {
        await finishImport(payload)
      }
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

  async function handleShare(finding: Finding) {
    try {
      const result = await shareFinding(finding)
      if (result === 'copied') toast.success('Skopiowano opis znaleziska do schowka.')
    } catch {
      toast.error('Nie udało się udostępnić znaleziska.')
    }
  }

  function handleStartEdit(finding: Finding) {
    setEditingId(finding.id ?? null)
    setEditSpeciesId(finding.speciesId ?? '')
    setEditNotes(finding.notes)
    setEditWeightGrams(finding.weightGrams != null ? String(finding.weightGrams) : '')
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
          weightGrams: editWeightGrams.trim() === '' ? undefined : Number(editWeightGrams),
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
    // max-w rośnie na szerszych ekranach - patrz ten sam zabieg i uzasadnienie w
    // EncyclopediaView.tsx. Lista znalezisk niżej dostaje odpowiadającą siatkę 2/3 kolumn.
    <div className="mx-auto flex h-full max-w-2xl flex-col gap-4 overflow-y-auto p-4 md:max-w-4xl lg:max-w-6xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Dziennik zbiorów</h1>
        {/* Trzy osobne przyciski (Eksportuj/Importuj/PDF) skonsolidowane w jedno menu - to akcje
            okazjonalne (backup, udostępnianie), nie codzienne, więc nie muszą zajmować stałego
            miejsca w nagłówku obok tytułu widoku. */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="outline" size="icon" aria-label="Eksport i import danych" />}
          >
            <MoreVerticalIcon className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleExport}>
              <DownloadIcon />
              Eksportuj (JSON)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
              <UploadIcon />
              Importuj
            </DropdownMenuItem>
            <DropdownMenuItem disabled={!filteredFindings} onClick={handleExportPdf}>
              <FileTextIcon />
              Eksportuj (PDF)
            </DropdownMenuItem>
            <DropdownMenuItem disabled={!filteredFindings} onClick={handleExportGpx}>
              <MapIcon />
              Eksportuj trasę (GPX)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          onChange={handleImportFile}
          className="hidden"
        />
      </div>

      <NotificationPermissionBanner />

      {severeReactionFindings.length > 0 && (
        <Alert variant="destructive-soft">
          <AlertTitle>⚠️ Zgłoszono ciężką reakcję po spożyciu</AlertTitle>
          <AlertDescription className="text-current">
            <p>
              Jeśli objawy są poważne (wymioty, biegunka, zaburzenia widzenia, żółtaczka), niezwłocznie
              skontaktuj się z Centrum Ostrych Zatruć lub zadzwoń pod 112. Zabierz ze sobą resztki grzybów
              i to znalezisko z dziennika jako informację dla lekarza.
            </p>
            <ul className="mt-1 list-inside list-disc text-xs">
              {severeReactionFindings.map((f) => {
                const overlapping = findOverlappingConsumedFindings(f, consumedFindings ?? [])
                return (
                  <li key={f.id}>
                    {f.speciesNameGuess ?? 'Nieokreślony gatunek'} —{' '}
                    {f.consumedAt ? formatDateTime(f.consumedAt) : ''}
                    {overlapping.length > 0 && ` (inne zjedzone w tym czasie: ${overlapping.length})`}
                  </li>
                )
              })}
            </ul>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2 border-destructive/60 text-destructive hover:bg-destructive/10"
              onClick={() => setShowFirstAid(true)}
            >
              Zobacz przewodnik pierwszej pomocy
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Sticky pasek wyszukiwania - patrz ten sam wzorzec i uzasadnienie w EncyclopediaView.tsx.
          Tu zostaje samo wyszukiwanie (bez filtra wypraw z TripsHistory poniżej), żeby nie
          przypinać zbyt dużej, rzadziej używanej sekcji nad długą listą znalezisk. */}
      <div className="sticky top-0 z-10 -mx-4 bg-background/95 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/85">
        <Input
          type="search"
          placeholder="Szukaj po gatunku lub notatkach..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <SeasonSummary />
      <TripManager />
      <TripsHistory selectedTripId={tripFilter} onSelectTrip={setTripFilter} />

      {selectedTrip && filteredFindings && (
        <Card size="sm" className="bg-muted/50">
          <CardContent className="flex flex-col gap-2">
            <div>
              <p className="text-sm font-medium">{selectedTrip.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatDateTime(selectedTrip.startedAt)}
                {selectedTrip.endedAt != null && ` – ${formatDateTime(selectedTrip.endedAt)}`}
                {' · '}
                {formatDuration(selectedTrip.startedAt, selectedTrip.endedAt)}
              </p>
            </div>
            {/* Liczby wyprawy jako kafle zamiast dalszego ciągu zdania rozdzielanego kropkami -
                czyta się od razu, nie trzeba wyłowić cyfr ze zdania. */}
            <StatTileRow>
              <StatTile value={filteredFindings.length} label="znalezisk" />
              <StatTile value={countSpeciesDiversity(filteredFindings)} label="gatunków" />
              {sumWeightGrams(filteredFindings) > 0 && (
                <StatTile value={formatWeight(sumWeightGrams(filteredFindings))} label="waga" />
              )}
            </StatTileRow>
          </CardContent>
        </Card>
      )}

      {chartData.length > 0 && (
        <div className="h-56 rounded border border-border p-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }}
                interval={0}
                angle={-20}
                textAnchor="end"
              />
              <YAxis allowDecimals={false} tick={{ fill: 'var(--color-muted-foreground)' }} />
              <Tooltip
                cursor={{ fill: 'var(--color-muted)' }}
                contentStyle={{
                  background: 'var(--color-popover)',
                  color: 'var(--color-popover-foreground)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelStyle={{ color: 'var(--color-popover-foreground)' }}
              />
              {/* Kolor słupka wg jadalności gatunku (skala z EdibilityBadge) zamiast płaskiego
                  zielonego - wykres pokazuje na pierwszy rzut oka nie tylko liczbę zbiorów, ale
                  i to, czy sezon był "bezpieczny" (przewaga zielonych słupków) czy nie. */}
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {chartData.map((entry) => (
                  <Cell key={entry.name} fill={edibilityChartColor(entry.edibility)} />
                ))}
              </Bar>
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

      <div ref={listRef} className="grid grid-cols-1 items-start gap-3 md:grid-cols-2 lg:grid-cols-3">
        {filteredFindings?.map((finding, index) => {
          if (finding.id != null && editingId === finding.id) {
            // Karta w trybie edycji (formularz z kilkoma polami) rozpięta na całą szerokość
            // siatki, niezależnie od tego w której kolumnie by wypadła - ścieśniony formularz w
            // jednej kolumnie 1/3 szerokości byłby niewygodny w użyciu.
            return (
              <Card key={finding.id} size="sm" className="ring-primary/40 md:col-span-2 lg:col-span-3">
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
                      className="w-fit text-destructive"
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

          // Kolor lewego paska + delikatny odcień tła wg jadalności gatunku - ta sama skala co w
          // EncyclopediaView.tsx, patrz uzasadnienie w komentarzu przy edibilityCardAccentClass.
          // Bez rozpoznanego gatunku (speciesId null/nieznany) karta zostaje bez akcentu.
          const findingSpecies = finding.speciesId
            ? (speciesData as Species[]).find((sp) => sp.id === finding.speciesId)
            : undefined

          return (
            // Karta jest bezpośrednim dzieckiem kontenera z `useAutoAnimate` (transform-based
            // pozycjonowanie przy sortowaniu/usuwaniu) - mikrointerakcja `whileTap` (motion) idzie
            // na wewnętrzny wrapper, nie na `Card`, żeby oba mechanizmy transformacji nie kolidowały.
            // hover:shadow (nie hover:-translate-y, celowo BEZ transform) - osobny transform z
            // hover kolidowałby z pozycjonowaniem useAutoAnimate (ten sam powód, dla którego
            // whileTap idzie na wewnętrzny motion.div, nie na Card - patrz komentarz wyżej).
            <Card
              key={finding.id}
              size="sm"
              style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}
              className={`stagger-item border-l-4 transition-shadow duration-200 hover:shadow-md hover:shadow-primary/15 ${
                findingSpecies ? edibilityCardAccentClass(findingSpecies.edibility) : 'border-l-border'
              }`}
            >
              <CardContent>
                <motion.div
                  className="flex items-start gap-3"
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                >
                  {finding.id != null && <FindingThumbnail findingId={finding.id} />}
                  <div className="flex flex-1 items-start justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <p className="font-medium">{finding.speciesNameGuess ?? 'Nieokreślony gatunek'}</p>
                        {findingSpecies && <EdibilityBadge edibility={findingSpecies.edibility} />}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(finding.createdAt)}
                        {finding.latitude != null && finding.longitude != null && (
                          <>
                            {' '}
                            · {finding.latitude.toFixed(4)}, {finding.longitude.toFixed(4)}
                          </>
                        )}
                        {finding.weightGrams != null && <> · {formatWeight(finding.weightGrams)}</>}
                      </p>
                      {finding.notes && <p className="mt-1 text-sm text-foreground/80">{finding.notes}</p>}
                      <ConsumptionTracker finding={finding} />
                    </div>
                    <div className="flex shrink-0 gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => handleShare(finding)}
                        className="rounded outline-none focus-visible:ring-3 focus-visible:ring-ring/50 text-muted-foreground hover:underline"
                      >
                        Udostępnij
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStartEdit(finding)}
                        className="rounded outline-none focus-visible:ring-3 focus-visible:ring-ring/50 text-muted-foreground hover:underline"
                      >
                        Edytuj
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(finding.id ?? null)}
                        className="rounded outline-none focus-visible:ring-3 focus-visible:ring-ring/50 text-destructive hover:underline"
                      >
                        Usuń
                      </button>
                    </div>
                  </div>
                </motion.div>
              </CardContent>
            </Card>
          )
        })}
        {filteredFindings?.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground md:col-span-2 lg:col-span-3"
          >
            <EmptyBasketIllustration className="size-14 text-muted-foreground" />
            <p className="text-sm">Brak zapisanych znalezisk dla wybranego filtru.</p>
          </motion.div>
        )}
      </div>

      {hasMoreFindings && (
        <Button variant="outline" size="sm" className="mx-auto" onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}>
          Załaduj więcej (pokazano {visibleCount} najnowszych)
        </Button>
      )}

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
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => confirmDeleteId != null && handleDelete(confirmDeleteId)}
            >
              Tak, usuń
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={pendingImport != null}
        onOpenChange={(open) => {
          if (!open) setPendingImport(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogTitle>Możliwe duplikaty w pliku</AlertDialogTitle>
          <AlertDialogDescription>
            {pendingImport?.duplicateCount} z {pendingImport?.payload.findings.length} znalezisk w tym pliku wygląda
            tak samo jak wpisy już zapisane w dzienniku - być może ten plik był już importowany. Zaimportować mimo
            to? Duplikaty zostaną dodane jako osobne, nowe wpisy.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (pendingImport) await finishImport(pendingImport.payload)
                setPendingImport(null)
              }}
            >
              Importuj mimo to
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FirstAidGuide open={showFirstAid} onOpenChange={setShowFirstAid} />
    </div>
  )
}
