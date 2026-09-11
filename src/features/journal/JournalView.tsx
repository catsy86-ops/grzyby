import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useRef, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { db } from '../../db/db'
import speciesData from '../../data/species.json'
import type { Species } from '../../db/schema'
import { downloadBlob, exportData, importData } from '../../utils/exportImport'
import { TripManager } from './TripManager'
import { TripsHistory } from './TripsHistory'

type TripFilter = number | 'wszystkie' | 'bez-wyprawy'

export function JournalView() {
  const findings = useLiveQuery(() => db.findings.orderBy('createdAt').reverse().toArray(), [])
  const [importMessage, setImportMessage] = useState<string | null>(null)
  const [tripFilter, setTripFilter] = useState<TripFilter>('wszystkie')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const filteredFindings = useMemo(() => {
    if (!findings) return findings
    if (tripFilter === 'wszystkie') return findings
    if (tripFilter === 'bez-wyprawy') return findings.filter((f) => f.tripId == null)
    return findings.filter((f) => f.tripId === tripFilter)
  }, [findings, tripFilter])

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
    await db.findings.delete(id)
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

      <TripManager />
      <TripsHistory selectedTripId={tripFilter} onSelectTrip={setTripFilter} />

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
        {filteredFindings?.map((finding) => (
          <div key={finding.id} className="flex items-start justify-between rounded border border-gray-200 p-3">
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
            </div>
            <button
              onClick={() => finding.id != null && handleDelete(finding.id)}
              className="text-xs text-red-600 hover:underline"
            >
              Usuń
            </button>
          </div>
        ))}
        {filteredFindings?.length === 0 && (
          <p className="text-sm text-gray-500">Brak zapisanych znalezisk dla wybranego filtru.</p>
        )}
      </div>
    </div>
  )
}
