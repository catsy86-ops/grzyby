import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'

interface TripsHistoryProps {
  selectedTripId: number | 'wszystkie' | 'bez-wyprawy'
  onSelectTrip: (tripId: number | 'wszystkie' | 'bez-wyprawy') => void
}

export function TripsHistory({ selectedTripId, onSelectTrip }: TripsHistoryProps) {
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
        {trips.map((trip) => (
          <button
            key={trip.id}
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
        ))}
      </div>
    </div>
  )
}
