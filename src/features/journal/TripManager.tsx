import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { db } from '../../db/db'
import { useAppStore } from '../../stores/appStore'
import { useActiveTrip } from '../../stores/useActiveTrip'
import { countSpeciesDiversity, formatDuration, formatWeight, isLongTrip, sumWeightGrams } from '../../utils/tripStats'
import { showLocalNotification } from '../../utils/notifications'
import { formatDate, formatDateTime } from '../../utils/formatDate'
import { StatTile, StatTileRow } from '../../components/StatTiles'
import { Button } from '../../components/ui/button'
import { Card, CardContent } from '../../components/ui/card'
import { Input } from '../../components/ui/input'

const LONG_TRIP_NOTIFIED_KEY = 'lysy-long-trip-notified-id'

// Żartobliwe pożegnanie przy starcie wyprawy - czysto kosmetyczny "uśmiech" (patrz prośba
// użytkownika), losowany za każdym razem. Piwko czeka PO powrocie, nie przed wyjściem w las -
// żeby żart nie brzmiał jak sugestia czegokolwiek przed jazdą/wyprawą w teren.
const TRIP_START_QUIPS = [
  '🍺 Piwko na drogę poczeka do powrotu. Smacznej wyprawy!',
  '🥾🍄 W las, w las! Piwko grzeje się w lodówce na Twój powrót.',
  '🍺 Zimne piwko już czeka w domu - najpierw znajdź te grzyby!',
  '🌲 Powodzenia w lesie! Piwko na powitanie odemierzone i gotowe.',
]

function randomTripStartQuip(): string {
  return TRIP_START_QUIPS[Math.floor(Math.random() * TRIP_START_QUIPS.length)]
}

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
    if (activeTripId == null || !activeTrip) return

    function checkLongTrip() {
      if (!activeTrip || !isLongTrip(activeTrip.startedAt)) return
      if (localStorage.getItem(LONG_TRIP_NOTIFIED_KEY) === String(activeTripId)) return
      localStorage.setItem(LONG_TRIP_NOTIFIED_KEY, String(activeTripId))
      showLocalNotification('Długa wyprawa w toku', {
        body: `Wyprawa "${activeTrip.name}" trwa już ${formatDuration(activeTrip.startedAt, null)}. Nie zapomnij jej zakończyć.`,
        tag: 'lysy-long-trip',
      })
    }

    checkLongTrip()
    const interval = setInterval(() => {
      forceTick((n) => n + 1)
      checkLongTrip()
    }, 60_000)
    return () => clearInterval(interval)
  }, [activeTripId, activeTrip])

  async function handleStartTrip() {
    const name = newTripName.trim() || `Wyprawa ${formatDate(new Date())}`
    const id = await db.trips.add({
      name,
      startedAt: Date.now(),
      endedAt: null,
      notes: '',
    })
    setActiveTripId(id)
    setNewTripName('')
    setShowNewTripInput(false)
    toast(randomTripStartQuip())
  }

  async function handleEndTrip() {
    if (activeTripId == null) return
    await db.trips.update(activeTripId, { endedAt: Date.now() })
    setActiveTripId(null)
  }

  if (activeTripId != null && activeTrip) {
    return (
      <Card size="sm" className="border-primary/30 bg-primary/5 ring-0">
        <CardContent className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-primary">🥾 Aktywna wyprawa: {activeTrip.name}</p>
              <p className="text-xs text-primary/80">
                Rozpoczęta {formatDateTime(activeTrip.startedAt)} ·{' '}
                {formatDuration(activeTrip.startedAt, null)}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 border-primary text-primary hover:bg-primary/10"
              onClick={handleEndTrip}
            >
              Zakończ wyprawę
            </Button>
          </div>
          <StatTileRow>
            <StatTile value={activeTripFindings?.length ?? 0} label="znalezisk" />
            {activeTripFindings && activeTripFindings.length > 0 && (
              <StatTile value={countSpeciesDiversity(activeTripFindings)} label="gatunków" />
            )}
            {activeTripFindings && sumWeightGrams(activeTripFindings) > 0 && (
              <StatTile value={formatWeight(sumWeightGrams(activeTripFindings))} label="waga" />
            )}
          </StatTileRow>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card size="sm">
      <CardContent>
        {showNewTripInput ? (
          <div className="flex gap-2">
            <Input
              type="text"
              value={newTripName}
              onChange={(e) => setNewTripName(e.target.value)}
              placeholder="Nazwa wyprawy (opcjonalnie)"
              className="flex-1"
              autoFocus
            />
            <Button onClick={handleStartTrip}>Start</Button>
            <Button variant="ghost" onClick={() => setShowNewTripInput(false)}>
              Anuluj
            </Button>
          </div>
        ) : (
          <Button className="w-full" onClick={() => setShowNewTripInput(true)}>
            🥾 Rozpocznij wyprawę
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
