import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { db } from '../../db/db'
import { useAppStore } from '../../stores/appStore'
import { useActiveTrip } from '../../stores/useActiveTrip'
import { countSpeciesDiversity, daysSinceLastTrip, formatDuration, formatWeight, isLongTrip, sumWeightGrams } from '../../utils/tripStats'
import { showLocalNotification } from '../../utils/notifications'
import { formatDate, formatDateTime } from '../../utils/formatDate'
import { getCurrentPosition } from '../../utils/geolocation'
import { buildLocationSmsUrl } from '../../utils/locationSms'
import { isTripOverdue } from '../../utils/overdueTrip'
import { fetchIsCurrentlyRaining } from '../../utils/rainCheck'
import { StatTile, StatTileRow } from '../../components/StatTiles'
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert'
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
  const emergencyInfo = useAppStore((s) => s.emergencyInfo)
  const [newTripName, setNewTripName] = useState('')
  const [plannedReturnHours, setPlannedReturnHours] = useState('')
  const [showNewTripInput, setShowNewTripInput] = useState(false)
  const [sendingLocationSms, setSendingLocationSms] = useState(false)
  // Odświeża licznik czasu trwania aktywnej wyprawy (i sprawdzenie przekroczenia planowanego
  // powrotu) co minutę, bez zapytań do bazy.
  const [now, setNow] = useState(() => Date.now())

  const activeTripFindings = useLiveQuery(
    () => (activeTripId != null ? db.findings.where('tripId').equals(activeTripId).toArray() : []),
    [activeTripId],
  )
  // Tylko do "ile dni od ostatniej wyprawy" niżej - liczba wypraw jest zwykle niewielka (w
  // odróżnieniu od znalezisk), więc pełne `toArray()` bez paginacji jest tu w porządku (ten sam
  // kompromis co SeasonSummary.tsx).
  const allTrips = useLiveQuery(() => db.trips.toArray(), [])
  const daysSinceLast = allTrips ? daysSinceLastTrip(allTrips, now) : null

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
      setNow(Date.now())
      checkLongTrip()
    }, 60_000)
    return () => clearInterval(interval)
  }, [activeTripId, activeTrip])

  async function handleStartTrip() {
    const name = newTripName.trim() || `Wyprawa ${formatDate(new Date())}`
    const hours = Number(plannedReturnHours)
    const plannedReturnAt = plannedReturnHours.trim() && hours > 0 ? Date.now() + hours * 60 * 60_000 : null
    const id = await db.trips.add({
      name,
      startedAt: Date.now(),
      endedAt: null,
      notes: '',
      plannedReturnAt,
    })
    setActiveTripId(id)
    setNewTripName('')
    setPlannedReturnHours('')
    setShowNewTripInput(false)
    toast(randomTripStartQuip())
  }

  async function handleEndTrip() {
    if (activeTripId == null) return
    await db.trips.update(activeTripId, { endedAt: Date.now() })
    setActiveTripId(null)

    // Best-effort: brak GPS/zasięgu w lesie jest normalny przy kończeniu wyprawy, więc
    // niepowodzenie po prostu zostawia `wasRainy` niezapisane, bez toasta/błędu.
    try {
      const position = await getCurrentPosition()
      const wasRainy = await fetchIsCurrentlyRaining(position.latitude, position.longitude)
      await db.trips.update(activeTripId, { wasRainy })
    } catch {
      // ignorowane celowo - patrz komentarz wyżej
    }
  }

  async function handleSendLocationSms() {
    setSendingLocationSms(true)
    try {
      const position = await getCurrentPosition()
      const url = buildLocationSmsUrl(position.latitude, position.longitude, emergencyInfo.contactPhone)
      window.location.href = url
    } catch {
      toast.error('Nie udało się ustalić lokalizacji do wysłania SMS-a.')
    } finally {
      setSendingLocationSms(false)
    }
  }

  const overdue = isTripOverdue(activeTrip?.plannedReturnAt, now)

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
          {overdue && (
            <Alert variant="warning">
              <AlertTitle>Wyprawa się przeciąga</AlertTitle>
              <AlertDescription className="flex flex-col gap-2">
                <span>Minął planowany czas powrotu. Jeśli wszystko OK, po prostu zakończ wyprawę.</span>
                <Button size="sm" variant="outline" onClick={handleSendLocationSms} disabled={sendingLocationSms}>
                  {sendingLocationSms ? 'Ustalanie pozycji…' : 'Wyślij SMS z lokalizacją'}
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card size="sm">
      <CardContent>
        {showNewTripInput ? (
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <Input
                type="text"
                value={newTripName}
                onChange={(e) => setNewTripName(e.target.value)}
                placeholder="Nazwa wyprawy (opcjonalnie)"
                className="flex-1"
                autoFocus
              />
            </div>
            <Input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.5"
              value={plannedReturnHours}
              onChange={(e) => setPlannedReturnHours(e.target.value)}
              placeholder="Planowany powrót za ile godzin (opcjonalnie)"
            />
            <div className="flex gap-2">
              <Button className="flex-1" onClick={handleStartTrip}>
                Start
              </Button>
              <Button variant="ghost" onClick={() => setShowNewTripInput(false)}>
                Anuluj
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <Button className="w-full" onClick={() => setShowNewTripInput(true)}>
              🥾 Rozpocznij wyprawę
            </Button>
            {daysSinceLast != null && daysSinceLast > 0 && (
              <p className="text-center text-xs text-muted-foreground">
                {daysSinceLast === 1 ? '1 dzień' : `${daysSinceLast} dni`} od ostatniej wyprawy
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
