import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useRef, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { db } from '../../db/db'
import speciesData from '../../data/species.json'
import type { Finding, Species } from '../../db/schema'
import { downloadBlob, exportData, importData } from '../../utils/exportImport'
import { findOverlappingConsumedFindings } from '../../utils/reactionTracking'
import { countSpeciesDiversity, formatDuration } from '../../utils/tripStats'
import { ConsumptionTracker } from './ConsumptionTracker'
import { FindingThumbnail } from './FindingThumbnail'
import { TripManager } from './TripManager'
import { TripsHistory } from './TripsHistory'

type TripFilter = number | 'wszystkie' | 'bez-wyprawy'

export function JournalView() {
  const findings = useLiveQuery(() => db.findings.orderBy('createdAt').reverse().toArray(), [])
  const [importMessage, setImportMessage] = useState<string | null>(null)
  const [tripFilter, setTripFilter] = useState<TripFilter>('wszystkie')
  const [searchQuery, setSearchQuery] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editSpeciesId, setEditSpeciesId] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
      setImportMessage(
        `Zaimportowano ${result.findingsImported} znalezisk i ${result.tripsImported} wypraw.`,
      )
    } catch (err) {
      setImportMessage(err instanceof Error ? `Błąd importu: ${err.message}` : 'Błąd importu pliku')
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
  }

  async function handleSaveEdit(id: number) {
    const species = (speciesData as Species[]).find((s) => s.id === editSpeciesId) ?? null
    await db.findings.update(id, {
      speciesId: species?.id ?? null,
      speciesNameGuess: species?.nameCommon ?? null,
      notes: editNotes,
    })
    setEditingId(null)
  }

  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col gap-4 overflow-y-auto p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Dziennik zbiorów</h1>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="rounded border border-green-800 px-3 py-1.5 text-xs font-medium text-green-800 hover:bg-green-50"
          >
            Eksportuj
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="rounded border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            Importuj
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            onChange={handleImportFile}
            className="hidden"
          />
        </div>
      </div>

      {importMessage && <p className="rounded bg-blue-50 p-2 text-xs text-blue-800">{importMessage}</p>}

      {severeReactionFindings.length > 0 && (
        <div className="rounded border border-red-400 bg-red-50 p-3 text-sm text-red-900">
          <p className="font-semibold">⚠️ Zgłoszono ciężką reakcję po spożyciu</p>
          <p className="mt-1 text-xs">
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
        </div>
      )}

      <input
        type="search"
        placeholder="Szukaj po gatunku lub notatkach..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="rounded border border-gray-300 p-2 text-sm"
      />

      <TripManager />
      <TripsHistory selectedTripId={tripFilter} onSelectTrip={setTripFilter} />

      {selectedTrip && filteredFindings && (
        <div className="rounded border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
          <p className="font-medium">{selectedTrip.name}</p>
          <p className="mt-1 text-xs text-gray-500">
            {new Date(selectedTrip.startedAt).toLocaleString('pl-PL')}
            {selectedTrip.endedAt != null && ` – ${new Date(selectedTrip.endedAt).toLocaleString('pl-PL')}`}
            {' · '}
            {formatDuration(selectedTrip.startedAt, selectedTrip.endedAt)} ·{' '}
            {filteredFindings.length} znalezisk · {countSpeciesDiversity(filteredFindings)} gatunków
          </p>
        </div>
      )}

      {chartData.length > 0 && (
        <div className="h-56 rounded border border-gray-200 p-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#2f5233" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {filteredFindings?.map((finding) => {
          if (finding.id != null && editingId === finding.id) {
            return (
              <div key={finding.id} className="flex flex-col gap-2 rounded border border-green-300 p-3">
                <label className="text-sm">
                  Gatunek
                  <select
                    value={editSpeciesId}
                    onChange={(e) => setEditSpeciesId(e.target.value)}
                    className="mt-1 w-full rounded border border-gray-300 p-2"
                  >
                    <option value="">-- nieokreślony --</option>
                    {(speciesData as Species[]).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nameCommon} ({s.nameLatin})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  Notatki
                  <textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    className="mt-1 w-full rounded border border-gray-300 p-2"
                    rows={2}
                  />
                </label>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setEditingId(null)}
                    className="rounded px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100"
                  >
                    Anuluj
                  </button>
                  <button
                    onClick={() => handleSaveEdit(finding.id!)}
                    className="rounded bg-green-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-900"
                  >
                    Zapisz
                  </button>
                </div>
              </div>
            )
          }

          return (
            <div key={finding.id} className="flex items-start gap-3 rounded border border-gray-200 p-3">
              {finding.id != null && <FindingThumbnail findingId={finding.id} />}
              <div className="flex flex-1 items-start justify-between">
                <div>
                  <p className="font-medium">{finding.speciesNameGuess ?? 'Nieokreślony gatunek'}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(finding.createdAt).toLocaleString('pl-PL')}
                    {finding.latitude != null && finding.longitude != null && (
                      <>
                        {' '}
                        · {finding.latitude.toFixed(4)}, {finding.longitude.toFixed(4)}
                      </>
                    )}
                  </p>
                  {finding.notes && <p className="mt-1 text-sm text-gray-700">{finding.notes}</p>}
                  <ConsumptionTracker finding={finding} />
                </div>
                {confirmDeleteId === finding.id ? (
                  <div className="flex shrink-0 items-center gap-2 text-xs">
                    <span className="text-gray-600">Na pewno?</span>
                    <button
                      onClick={() => finding.id != null && handleDelete(finding.id)}
                      className="font-medium text-red-600 hover:underline"
                    >
                      Tak, usuń
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="text-gray-500 hover:underline"
                    >
                      Anuluj
                    </button>
                  </div>
                ) : (
                  <div className="flex shrink-0 gap-2 text-xs">
                    <button onClick={() => handleStartEdit(finding)} className="text-gray-600 hover:underline">
                      Edytuj
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(finding.id ?? null)}
                      className="text-red-600 hover:underline"
                    >
                      Usuń
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
        {filteredFindings?.length === 0 && (
          <p className="text-sm text-gray-500">Brak zapisanych znalezisk dla wybranego filtru.</p>
        )}
      </div>
    </div>
  )
}
