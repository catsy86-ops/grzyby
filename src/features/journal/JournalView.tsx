import { useLiveQuery } from 'dexie-react-hooks'
import { Suspense, useMemo, useRef, useState } from 'react'
import { useAutoAnimate } from '@formkit/auto-animate/react'
import { AnimatePresence, motion } from 'motion/react'
import { toast } from 'sonner'
import { ListFilterIcon } from 'lucide-react'
import { EmptyBasketIllustration } from '../../components/icons/illustrations'
import { db } from '../../db/db'
import { useAppStore } from '../../stores/appStore'
import speciesData from '../../data/species.json'
import type { Finding, Species } from '../../db/schema'
import { edibilityChartColor } from '../../components/EdibilityBadge'
import { StatTile, StatTileRow } from './StatTiles'
import {
  buildExportFilename,
  countLikelyDuplicates,
  downloadBlob,
  exportData,
  importPayload,
  readExportFile,
  type ExportPayload,
} from '../../utils/exportImport'
import { compressPhoto, createThumbnail } from '../../utils/imageUtils'
import { exportFindingsToPdf } from '../../utils/pdfExport'
import { exportFindingsToGpx } from '../../utils/gpxExport'
import { exportFindingsToCsv } from '../../utils/csvExport'
import { findOverlappingConsumedFindings } from '../../utils/reactionTracking'
import { filterIncompleteFindings, isIncompleteFinding } from '../../utils/findingCompleteness'
import { isWithinDateRange, type SortOrder } from '../../utils/journalFilters'
import { rankSpotsByFindingCount } from '../../utils/spotStats'
import {
  countSpeciesDiversity,
  formatDuration,
  formatWeight,
  groupFindingsByMonth,
  groupFindingsBySpeciesCount,
  sumWeightGrams,
} from '../../utils/tripStats'
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
import { Badge } from '../../components/ui/badge'
import { Card, CardContent } from '../../components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu'
import { Input } from '../../components/ui/input'
import { Skeleton } from '../../components/ui/skeleton'
import { FirstAidGuide } from '../tools/FirstAidGuide'
import { NotificationPermissionBanner } from './NotificationPermissionBanner'
import { BackupReminderBanner } from './BackupReminderBanner'
import { lazyRetry } from '../../utils/lazyRetry'
import { AchievementsDrawer } from './AchievementsDrawer'
import { FindingCard } from './FindingCard'
import { FindingEditForm, type FindingEditValues } from './FindingEditForm'
import { JournalExportMenu } from './JournalExportMenu'
import { SeasonSummary } from './SeasonSummary'
import { TripManager } from './TripManager'
import { TripsHistory } from './TripsHistory'
import { formatDateTime } from '../../utils/formatDate'
import { shareFinding } from '../../utils/shareFinding'

// recharts (wewnątrz JournalBarChart) leżałoby w głównym module-graph tego widoku, blokując
// pierwsze wyrenderowanie listy znalezisk (główna treść) na czas parsowania/wykonania biblioteki
// wykresów - nawet dla użytkownika z 0-2 wpisami, dla którego wykresy i tak się nie pokażą
// (`chartData.length > 0` itd. niżej). `Suspense fallback={null}` zamiast skeletonu - wykresy
// pojawiają się chwilę po liście, nie ma sensu rezerwować dla nich miejsca zanim wiadomo, czy w
// ogóle będzie co pokazać.
const JournalBarChart = lazyRetry(() =>
  import('./JournalBarChart').then((m) => ({ default: m.JournalBarChart })),
)

type TripFilter = number | 'wszystkie' | 'bez-wyprawy'
// Strona listy znalezisk - bez tego `db.findings.toArray()` ładowałby całą historię do pamięci
// przy każdej zmianie (useLiveQuery), co przy wieloletnim dzienniku zbiorów niepotrzebnie rośnie.
// Ostrzeżenie o ciężkich reakcjach (patrz `severeReactionFindings` niżej) celowo NIE jest objęte
// tym limitem - to alert bezpieczeństwa i musi widzieć całą historię, nie tylko najnowszą stronę.
const PAGE_SIZE = 100

export function JournalView() {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest')
  const pageQueryResult = useLiveQuery(() => {
    const query = db.findings.orderBy('createdAt')
    return (sortOrder === 'newest' ? query.reverse() : query).limit(visibleCount + 1).toArray()
  }, [visibleCount, sortOrder])
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
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  // "Do uzupełnienia" (ROZBUDOWA-ROADMAP.md Część 2 pkt 3) - znaleziska bez gatunku lub bez
  // zdjęcia, częste przy szybkim dyktowaniu głosowym w terenie. Zakres celowo ograniczony do
  // aktualnie wczytanej strony (ta sama `PAGE_SIZE`-owa logika co reszta widoku) - pełne
  // przeszukanie całej historii kłóciłoby się z powodem, dla którego paginacja w ogóle istnieje
  // (patrz komentarz przy PAGE_SIZE wyżej), a najświeższe wpisy to i tak te najbardziej warte
  // domknięcia.
  const [showIncompleteOnly, setShowIncompleteOnly] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [pendingImport, setPendingImport] = useState<{ payload: ExportPayload; duplicateCount: number } | null>(null)
  const [showFirstAid, setShowFirstAid] = useState(false)
  const [showAchievements, setShowAchievements] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [listRef] = useAutoAnimate()

  const selectedTrip = useLiveQuery(
    () => (typeof tripFilter === 'number' ? db.trips.get(tripFilter) : undefined),
    [tripFilter],
  )

  // Tylko klucze indeksu `findingId` (patrz db.ts), nie pełne rekordy - unika wczytywania
  // blobów zdjęć tylko po to, by sprawdzić ich istnienie.
  const photoFindingIds = useLiveQuery(() => db.photos.orderBy('findingId').uniqueKeys(), [])
  const photoFindingIdSet = useMemo(() => new Set((photoFindingIds ?? []) as number[]), [photoFindingIds])
  const incompleteFindings = useMemo(
    () => (findings ? filterIncompleteFindings(findings, photoFindingIdSet) : []),
    [findings, photoFindingIdSet],
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
    if (dateFrom || dateTo) {
      result = result.filter((f) => isWithinDateRange(f.createdAt, dateFrom, dateTo))
    }
    if (showIncompleteOnly) result = result.filter((f) => isIncompleteFinding(f, photoFindingIdSet))
    return result
  }, [findings, tripFilter, searchQuery, dateFrom, dateTo, showIncompleteOnly, photoFindingIdSet])

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
    return Array.from(counts.entries()).map(([name, { count, edibility }]) => ({
      name,
      count,
      fill: edibilityChartColor(edibility),
    }))
  }, [filteredFindings])

  const spots = useLiveQuery(() => db.spots.toArray(), [])
  const spotChartData = useMemo(() => {
    if (!filteredFindings || !spots) return []
    return rankSpotsByFindingCount(filteredFindings, spots)
  }, [filteredFindings, spots])

  const monthlyChartData = useMemo(() => {
    if (!filteredFindings) return []
    return groupFindingsByMonth(filteredFindings)
  }, [filteredFindings])
  const hasMonthlyFindings = monthlyChartData.some((m) => m.count > 0)

  const tripSpeciesBreakdown = useMemo(() => {
    if (!selectedTrip || !filteredFindings) return []
    return groupFindingsBySpeciesCount(filteredFindings).map(({ speciesId, count }) => ({
      count,
      name: (speciesId && (speciesData as Species[]).find((s) => s.id === speciesId)?.nameCommon) ?? 'Nieokreślony',
    }))
  }, [selectedTrip, filteredFindings])

  async function handleExport() {
    const blob = await exportData()
    downloadBlob(blob, `lysy-dziennik-${new Date().toISOString().slice(0, 10)}.json`)
    useAppStore.getState().setLastExportAt(Date.now())
  }

  async function handleExportPdf() {
    if (!filteredFindings) return
    const blob = await exportFindingsToPdf(filteredFindings, {
      title: selectedTrip ? selectedTrip.name : 'Dziennik zbiorów',
      subtitle: searchQuery.trim() ? `Filtr: "${searchQuery.trim()}"` : undefined,
      tripInfo: selectedTrip ? { startedAt: selectedTrip.startedAt, endedAt: selectedTrip.endedAt } : undefined,
    })
    downloadBlob(blob, buildExportFilename(selectedTrip?.name, 'pdf'))
  }

  function handleExportGpx() {
    if (!filteredFindings) return
    const blob = exportFindingsToGpx(filteredFindings)
    downloadBlob(blob, buildExportFilename(selectedTrip?.name, 'gpx'))
  }

  function handleExportCsv() {
    if (!filteredFindings) return
    const blob = exportFindingsToCsv(filteredFindings)
    downloadBlob(blob, buildExportFilename(selectedTrip?.name, 'csv'))
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
    const deletedFinding = findings?.find((f) => f.id === id)
    const deletedPhotos = await db.photos.where('findingId').equals(id).toArray()
    await db.transaction('rw', db.findings, db.photos, async () => {
      await db.photos.where('findingId').equals(id).delete()
      await db.findings.delete(id)
    })
    setConfirmDeleteId(null)
    toast.success('Usunięto znalezisko.', {
      duration: 8000,
      action: {
        label: 'Cofnij',
        onClick: () => {
          if (!deletedFinding) return
          void db.transaction('rw', db.findings, db.photos, async () => {
            await db.findings.put(deletedFinding)
            for (const photo of deletedPhotos) await db.photos.put(photo)
          })
        },
      },
    })
  }

  async function handleShare(finding: Finding) {
    try {
      const photo = finding.id != null ? await db.photos.where('findingId').equals(finding.id).first() : undefined
      const result = await shareFinding(finding, photo?.blob)
      if (result === 'copied') toast.success('Skopiowano opis znaleziska do schowka.')
    } catch {
      toast.error('Nie udało się udostępnić znaleziska.')
    }
  }

  async function handleSaveEdit(id: number, values: FindingEditValues) {
    try {
      // Kompresja zdjęcia musi zajść PRZED transakcją Dexie - operacje asynchroniczne spoza API
      // Dexie w środku transakcji przedwcześnie ją zamykają (patrz utils/exportImport.ts).
      const newPhoto = values.photo
        ? await Promise.all([compressPhoto(values.photo), createThumbnail(values.photo)]).then(
            ([blob, thumbnailBlob]) => ({ blob, thumbnailBlob }),
          )
        : null

      await db.transaction('rw', db.findings, db.photos, async () => {
        await db.findings.update(id, {
          speciesId: values.speciesId,
          speciesNameGuess: values.speciesNameGuess,
          notes: values.notes,
          weightGrams: values.weightGrams,
          driedWeightGrams: values.driedWeightGrams,
          quantity: values.quantity,
          latitude: values.latitude,
          longitude: values.longitude,
        })
        if (newPhoto) {
          await db.photos.where('findingId').equals(id).delete()
          await db.photos.add({ findingId: id, blob: newPhoto.blob, thumbnailBlob: newPhoto.thumbnailBlob })
        } else if (values.removePhoto) {
          await db.photos.where('findingId').equals(id).delete()
        }
      })
      setEditingId(null)
    } catch (err) {
      // Dexie przechwytuje natywne błędy IndexedDB (w tym QuotaExceededError) i remapuje je na
      // własne klasy dziedziczące po `Error` (`mapError` w dexie.js), NIE po `DOMException` -
      // `err instanceof DOMException` nigdy by tu nie złapało realnego przepełnienia limitu
      // pamięci zgłoszonego przez Dexie (zweryfikowane testem mockującym `db.findings.update`).
      toast.error(
        err instanceof Error && err.name === 'QuotaExceededError'
          ? 'Brak miejsca na urządzeniu - zwolnij pamięć (np. w "Pamięć i dane") i spróbuj ponownie.'
          : 'Nie udało się zapisać zmian. Spróbuj ponownie.',
      )
    }
  }

  return (
    // max-w rośnie na szerszych ekranach - patrz ten sam zabieg i uzasadnienie w
    // EncyclopediaView.tsx. Lista znalezisk niżej dostaje odpowiadającą siatkę 2/3 kolumn.
    <div className="mx-auto flex h-full max-w-2xl flex-col gap-4 overflow-y-auto p-4 md:max-w-4xl lg:max-w-6xl">
      <div className="flex items-center justify-between">
        <h1 className="text-heading-md font-semibold tracking-tight">Dziennik zbiorów</h1>
        <JournalExportMenu
          canExport={!!filteredFindings}
          onExport={handleExport}
          onExportPdf={handleExportPdf}
          onExportGpx={handleExportGpx}
          onExportCsv={handleExportCsv}
          fileInputRef={fileInputRef}
          onImportFile={handleImportFile}
          onOpenAchievements={() => setShowAchievements(true)}
        />
      </div>

      <NotificationPermissionBanner />
      <BackupReminderBanner onExport={handleExport} />

      {incompleteFindings.length > 0 && (
        <Alert className="flex items-center justify-between gap-2">
          <AlertDescription className="text-current">
            {showIncompleteOnly
              ? `Pokazano ${incompleteFindings.length} ${incompleteFindings.length === 1 ? 'znalezisko' : 'znalezisk'} bez gatunku lub zdjęcia (z ostatnio wczytanych).`
              : `${incompleteFindings.length} ${incompleteFindings.length === 1 ? 'znalezisko' : 'znalezisk'} bez gatunku lub zdjęcia wśród ostatnio wczytanych.`}
          </AlertDescription>
          <Button size="sm" variant={showIncompleteOnly ? 'outline' : 'default'} onClick={() => setShowIncompleteOnly((v) => !v)}>
            {showIncompleteOnly ? 'Pokaż wszystkie' : 'Pokaż'}
          </Button>
        </Alert>
      )}

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
        <div className="flex gap-2">
          <Input
            type="search"
            placeholder="Szukaj po gatunku lub notatkach..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
          />
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline"
                  size="icon"
                  className="relative shrink-0"
                  aria-label="Sortowanie i zakres dat"
                />
              }
            >
              <ListFilterIcon />
              {(sortOrder !== 'newest' || dateFrom || dateTo) && (
                <span
                  aria-hidden="true"
                  className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-primary"
                />
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Sortowanie</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={sortOrder} onValueChange={(v) => setSortOrder(v as SortOrder)}>
                  <DropdownMenuRadioItem value="newest">Najnowsze najpierw</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="oldest">Najstarsze najpierw</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuLabel className="flex items-center justify-between gap-2">
                  Zakres dat
                  {(dateFrom || dateTo) && (
                    <button
                      type="button"
                      onClick={() => {
                        setDateFrom('')
                        setDateTo('')
                      }}
                      className="text-xs font-normal text-primary underline underline-offset-2"
                    >
                      Wyczyść
                    </button>
                  )}
                </DropdownMenuLabel>
                <div className="flex flex-col gap-2 px-2 pb-2">
                  <label className="block text-xs text-muted-foreground">
                    Od
                    <Input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="mt-1"
                    />
                  </label>
                  <label className="block text-xs text-muted-foreground">
                    Do
                    <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="mt-1" />
                  </label>
                </div>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {/* Liczba wyników pojawia się dopiero przy aktywnym wyszukiwaniu/filtrze (nie duplikuje
            kafla "znalezisk" z karty wyprawy poniżej) i "odbija się" animowaną liczbą przy każdej
            zmianie zapytania - natychmiastowa informacja zwrotna podczas pisania, nie dopiero po
            policzeniu kart w liście. */}
        {(searchQuery.trim() !== '' || dateFrom || dateTo) && filteredFindings && (
          <p
            aria-label={`Liczba wyników: ${filteredFindings.length}`}
            className="mt-1.5 flex items-baseline gap-1 text-xs text-muted-foreground"
          >
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={filteredFindings.length}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6, position: 'absolute' }}
                transition={{ duration: 0.16 }}
                aria-hidden="true"
                className="font-medium tabular-nums text-foreground"
              >
                {filteredFindings.length}
              </motion.span>
            </AnimatePresence>
            <span aria-hidden="true">{filteredFindings.length === 1 ? 'wynik' : 'wyników'}</span>
          </p>
        )}
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
            {tripSpeciesBreakdown.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tripSpeciesBreakdown.map(({ name, count }) => (
                  <Badge key={name} variant="secondary" className="font-normal">
                    {name}×{count}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* recharts dociąga się osobnym chunkiem (patrz komentarz przy lazyRetry(JournalBarChart)
          wyżej) - `fallback={null}` zamiast skeletonu, wykresy po prostu pojawiają się chwilę po
          reszcie strony. */}
      <Suspense fallback={null}>
        {/* Kolor słupka wg jadalności gatunku (skala z EdibilityBadge, patrz `chartData`) zamiast
            płaskiego zielonego - wykres pokazuje na pierwszy rzut oka nie tylko liczbę zbiorów, ale
            i to, czy sezon był "bezpieczny" (przewaga zielonych słupków) czy nie. */}
        {chartData.length > 0 && <JournalBarChart data={chartData} angledLabels />}

        {/* Rozkład znalezisk wg miesiąca bieżącego roku - inny wymiar niż wykres po gatunkach
            wyżej (ten pokazuje "kiedy", nie "co"). Ukryty gdy cały rok jest pusty (np. świeże
            konto), żeby nie pokazywać samych zer. */}
        {hasMonthlyFindings && (
          <JournalBarChart data={monthlyChartData.map((m) => ({ name: m.month, count: m.count }))} />
        )}

        {/* "Najlepsze miejscówki" - inny wymiar niż wykres po gatunkach/miesiącach wyżej (ten
            pokazuje "gdzie"). Ukryty przy braku znalezisk powiązanych z zapisanym grzybowiskiem
            (np. świeże konto bez zapisanych spotów). */}
        {spotChartData.length > 0 && <JournalBarChart data={spotChartData} angledLabels />}
      </Suspense>

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
            return (
              <FindingEditForm
                key={finding.id}
                finding={finding}
                onCancel={() => setEditingId(null)}
                onSave={handleSaveEdit}
              />
            )
          }

          // Bez rozpoznanego gatunku (speciesId null/nieznany) karta zostaje bez akcentu jadalności
          // (patrz FindingCard.tsx/edibilityCardAccentClass).
          const findingSpecies = finding.speciesId
            ? (speciesData as Species[]).find((sp) => sp.id === finding.speciesId)
            : undefined

          return (
            <FindingCard
              key={finding.id}
              finding={finding}
              species={findingSpecies}
              index={index}
              onShare={handleShare}
              onEdit={(f) => setEditingId(f.id ?? null)}
              onDeleteRequest={setConfirmDeleteId}
            />
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
      <AchievementsDrawer open={showAchievements} onOpenChange={setShowAchievements} />
    </div>
  )
}
