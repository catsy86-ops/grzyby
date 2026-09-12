import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { db } from '../../db/db'
import { useAppStore } from '../../stores/appStore'
import { useActiveTrip } from '../../stores/useActiveTrip'
import { countSpeciesDiversity, formatDuration } from '../../utils/tripStats'

export function TripManager() {
  const { activeTripId, activeTrip } = useActiveTrip()
  const setActiveTripId = useAppStore((s) => s.setActiveTripId)
  const [newTripName, setNewTripName] = useState('')
  const [showNewTripInput, setShowNewTripInput] = useState(false)
  // Odświeża licznik czasu trwania aktywnej wyprawy co minutę, bez zapytań do bazy.
  const [, forceTick] = useState(0)

  const activeTripFindings = useLiveQuery(
    () => (activeTripId != null ? db.findings.where('tripId').equals(activeTripId).toArray() : []),
    [activeTripId],
  )

  useEffect(() => {
    if (activeTripId == null) return
    const interval = setInterval(() => forceTick((n) => n + 1), 60_000)
    return () => clearInterval(interval)
  }, [activeTripId])

  async function handleStartTrip() {
    const name = newTripName.trim() || `Wyprawa ${new Date().toLocaleDateString('pl-PL')}`
    const id = await db.trips.add({
      name,
      startedAt: Date.now(),
      endedAt: null,
      notes: '',
    })
    setActiveTripId(id)
    setNewTripName('')
    setShowNewTripInput(false)
  }

  async function handleEndTrip() {
    if (activeTripId == null) return
    await db.trips.update(activeTripId, { endedAt: Date.now() })
    setActiveTripId(null)
  }

  if (activeTripId != null && activeTrip) {
    return (
      <div className="flex items-center justify-between rounded border border-green-300 bg-green-50 p-3">
        <div>
          <p className="text-sm font-semibold text-green-900">🥾 Aktywna wyprawa: {activeTrip.name}</p>
          <p className="text-xs text-green-700">
            Rozpoczęta {new Date(activeTrip.startedAt).toLocaleString('pl-PL')} ·{' '}
            {formatDuration(activeTrip.startedAt, null)} · {activeTripFindings?.length ?? 0} znalezisk
            {activeTripFindings && activeTripFindings.length > 0 && (
              <> · {countSpeciesDiversity(activeTripFindings)} gatunków</>
            )}
          </p>
        </div>
        <button
          onClick={handleEndTrip}
          className="rounded border border-green-800 px-3 py-1.5 text-xs font-medium text-green-800 hover:bg-green-100"
        >
          Zakończ wyprawę
        </button>
      </div>
    )
  }

  return (
    <div className="rounded border border-gray-200 p-3">
      {showNewTripInput ? (
        <div className="flex gap-2">
          <input
            type="text"
            value={newTripName}
            onChange={(e) => setNewTripName(e.target.value)}
            placeholder="Nazwa wyprawy (opcjonalnie)"
            className="flex-1 rounded border border-gray-300 p-2 text-sm"
            autoFocus
          />
          <button
            onClick={handleStartTrip}
            className="rounded bg-green-800 px-3 py-2 text-sm font-medium text-white hover:bg-green-900"
          >
            Start
          </button>
          <button
            onClick={() => setShowNewTripInput(false)}
            className="rounded px-3 py-2 text-sm text-gray-600 hover:bg-gray-100"
          >
            Anuluj
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowNewTripInput(true)}
          className="w-full rounded bg-green-800 px-3 py-2 text-sm font-medium text-white hover:bg-green-900"
        >
          🥾 Rozpocznij wyprawę
        </button>
      )}
    </div>
  )
}
