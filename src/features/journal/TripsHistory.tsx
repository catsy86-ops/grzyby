import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import { useAppStore } from '../../stores/appStore'

interface TripsHistoryProps {
  selectedTripId: number | 'wszystkie' | 'bez-wyprawy'
  onSelectTrip: (tripId: number | 'wszystkie' | 'bez-wyprawy') => void
}

export function TripsHistory({ selectedTripId, onSelectTrip }: TripsHistoryProps) {
  const activeTripId = useAppStore((s) => s.activeTripId)
  const setActiveTripId = useAppStore((s) => s.setActiveTripId)
  const trips = useLiveQuery(() => db.trips.orderBy('startedAt').reverse().toArray(), [])
  const findingCounts = useLiveQuery(async () => {
    const all = await db.findings.toArray()
    const counts = new Map<number, number>()
    for (const finding of all) {
      if (finding.tripId != null) counts.set(finding.tripId, (counts.get(finding.tripId) ?? 0) + 1)
    }
    return counts
  }, [])

  if (!trips || trips.length === 0) return null

  async function handleEndOrphanedTrip(tripId: number) {
    await db.trips.update(tripId, { endedAt: Date.now() })
  }

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold text-gray-700">Wyprawy</h2>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onSelectTrip('wszystkie')}
          className={`rounded-full border px-3 py-1 text-xs font-medium ${
            selectedTripId === 'wszystkie'
              ? 'border-green-800 bg-green-800 text-white'
              : 'border-gray-300 text-gray-700'
          }`}
        >
          Wszystkie znaleziska
        </button>
        <button
          onClick={() => onSelectTrip('bez-wyprawy')}
          className={`rounded-full border px-3 py-1 text-xs font-medium ${
            selectedTripId === 'bez-wyprawy'
              ? 'border-green-800 bg-green-800 text-white'
              : 'border-gray-300 text-gray-700'
          }`}
        >
          Bez wyprawy
        </button>
        {trips.map((trip) => {
          // Wyprawa bez daty zakończenia, która nie jest aktywną wyprawą w tej sesji -
          // najczęściej po utracie stanu (zamknięcie appki w lesie) lub imporcie danych.
          const isOrphanedOpen = trip.endedAt == null && trip.id !== activeTripId
          return (
            <div key={trip.id} className="flex items-center gap-1">
              <button
                onClick={() => trip.id != null && onSelectTrip(trip.id)}
                className={`rounded-full border px-3 py-1 text-xs font-medium ${
                  selectedTripId === trip.id
                    ? 'border-green-800 bg-green-800 text-white'
                    : 'border-gray-300 text-gray-700'
                }`}
              >
                {trip.name} ({findingCounts?.get(trip.id!) ?? 0})
                {trip.endedAt == null && ' 🥾'}
              </button>
              {isOrphanedOpen && (
                <>
                  <button
                    onClick={() => setActiveTripId(trip.id!)}
                    className="rounded-full border border-green-800 px-2 py-1 text-xs font-medium text-green-800 hover:bg-green-50"
                    title="Ustaw jako aktywną wyprawę i kontynuuj dodawanie do niej znalezisk"
                  >
                    Wznów
                  </button>
                  <button
                    onClick={() => handleEndOrphanedTrip(trip.id!)}
                    className="rounded-full border border-gray-300 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
                    title="Oznacz tę wyprawę jako zakończoną"
                  >
                    Zakończ
                  </button>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
