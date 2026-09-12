import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import { useAppStore } from '../../stores/appStore'
import { Button } from '../../components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '../../components/ui/toggle-group'

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
      <h2 className="text-sm font-semibold text-muted-foreground">Wyprawy</h2>
      <ToggleGroup
        variant="outline"
        value={[String(selectedTripId)]}
        onValueChange={(values) => {
          const [v] = values
          if (v == null) return
          if (v === 'wszystkie' || v === 'bez-wyprawy') onSelectTrip(v)
          else onSelectTrip(Number(v))
        }}
        className="w-full flex-wrap"
      >
        <ToggleGroupItem value="wszystkie" className="rounded-full">
          Wszystkie znaleziska
        </ToggleGroupItem>
        <ToggleGroupItem value="bez-wyprawy" className="rounded-full">
          Bez wyprawy
        </ToggleGroupItem>
        {trips.map((trip) => {
          // Wyprawa bez daty zakończenia, która nie jest aktywną wyprawą w tej sesji -
          // najczęściej po utracie stanu (zamknięcie appki w lesie) lub imporcie danych.
          const isOrphanedOpen = trip.endedAt == null && trip.id !== activeTripId
          return (
            <div key={trip.id} className="flex items-center gap-1">
              <ToggleGroupItem value={String(trip.id)} className="rounded-full">
                {trip.name} ({findingCounts?.get(trip.id!) ?? 0})
                {trip.endedAt == null && ' 🥾'}
              </ToggleGroupItem>
              {isOrphanedOpen && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    onClick={() => setActiveTripId(trip.id!)}
                    title="Ustaw jako aktywną wyprawę i kontynuuj dodawanie do niej znalezisk"
                  >
                    Wznów
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    onClick={() => handleEndOrphanedTrip(trip.id!)}
                    title="Oznacz tę wyprawę jako zakończoną"
                  >
                    Zakończ
                  </Button>
                </>
              )}
            </div>
          )
        })}
      </ToggleGroup>
    </div>
  )
}
