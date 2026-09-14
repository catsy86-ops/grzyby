import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect } from 'react'
import { db } from '../db/db'
import { useActiveTrip } from '../stores/useActiveTrip'
import { showLocalNotification } from '../utils/notifications'
import { shouldRemindSpray, shouldRemindTickCheck } from '../utils/tickReminders'

const SPRAY_LAST_NOTIFIED_KEY_PREFIX = 'lysy-tick-spray-last-notified-'
const CHECK_NOTIFIED_TRIP_IDS_KEY = 'lysy-tick-check-notified-trip-ids'
const CHECK_INTERVAL_MS = 60 * 60_000 // sprawdzanie co godzinę wystarcza dla obu przypomnień

function readNotifiedTripIds(): Set<number> {
  try {
    const raw = localStorage.getItem(CHECK_NOTIFIED_TRIP_IDS_KEY)
    if (!raw) return new Set()
    return new Set(JSON.parse(raw) as number[])
  } catch {
    return new Set()
  }
}

function markTripNotified(tripId: number) {
  const notified = readNotifiedTripIds()
  notified.add(tripId)
  try {
    localStorage.setItem(CHECK_NOTIFIED_TRIP_IDS_KEY, JSON.stringify([...notified]))
  } catch {
    // localStorage niedostępny/pełny - przypomnienie może się powtórzyć, nie krytyczne
  }
}

// "Asystent ochrony przed kleszczami" - dwa lokalne przypomnienia, oba na infrastrukturze
// `showLocalNotification` (ta sama co przypomnienie o długiej wyprawie, P2):
// 1. W trakcie aktywnej wyprawy: co ok. 3-4h przypomnienie o ponownym spryskaniu preparatem.
// 2. Po zakończeniu wyprawy: jednorazowe przypomnienie o kontroli skóry po ok. 14 dniach -
//    działa tylko, gdy apka zostanie otwarta po tym czasie (brak backendu = brak realnego
//    push w tle), świadomy kompromis zgodny z resztą architektury offline-first.
export function useTickReminders() {
  const { activeTripId, activeTrip } = useActiveTrip()
  const endedTrips = useLiveQuery(() => db.trips.filter((t) => t.endedAt != null).toArray(), [])

  useEffect(() => {
    if (activeTripId == null || !activeTrip) return
    const key = `${SPRAY_LAST_NOTIFIED_KEY_PREFIX}${activeTripId}`

    function checkSpray() {
      const lastNotified = Number(localStorage.getItem(key)) || activeTrip!.startedAt
      if (!shouldRemindSpray(lastNotified, Date.now())) return
      localStorage.setItem(key, String(Date.now()))
      showLocalNotification('Przypomnienie o kleszczach', {
        body: 'Minęło kilka godzin wyprawy - dobry moment na ponowne spryskanie preparatem na kleszcze.',
        tag: 'lysy-tick-spray',
      })
    }

    checkSpray()
    const interval = setInterval(checkSpray, CHECK_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [activeTripId, activeTrip])

  useEffect(() => {
    if (!endedTrips) return

    function checkPostTripReminders() {
      const notified = readNotifiedTripIds()
      const now = Date.now()
      for (const trip of endedTrips ?? []) {
        if (trip.id == null || trip.endedAt == null) continue
        if (notified.has(trip.id)) continue
        if (!shouldRemindTickCheck(trip.endedAt, now)) continue
        markTripNotified(trip.id)
        showLocalNotification('Kontrola po kleszczach', {
          body: `Minęło 14 dni od wyprawy "${trip.name}" - dobry moment, żeby sprawdzić skórę pod kątem rumienia po ukąszeniu kleszcza.`,
          tag: `lysy-tick-check-${trip.id}`,
        })
      }
    }

    checkPostTripReminders()
    const interval = setInterval(checkPostTripReminders, CHECK_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [endedTrips])
}
