import { useEffect } from 'react'
import { useActiveTrip } from '../stores/useActiveTrip'
import { showLocalNotification } from '../utils/notifications'
import { isTripOverdue } from '../utils/overdueTrip'

const NOTIFIED_KEY_PREFIX = 'lysy-overdue-trip-notified-'
const CHECK_INTERVAL_MS = 5 * 60_000

// "Planowany powrót" - jeśli użytkownik przy starcie wyprawy podał orientacyjny czas powrotu
// (patrz TripManager.tsx) i wyprawa się przeciąga, jednorazowe lokalne przypomnienie. Sam
// interfejs (Karta Awaryjna, przygotowany SMS z lokalizacją) jest pokazywany przez TripManager
// niezależnie od tego, czy powiadomienia są włączone - to tylko dodatkowy sygnał, nie jedyny.
export function useOverdueTripReminder() {
  const { activeTripId, activeTrip } = useActiveTrip()

  useEffect(() => {
    if (activeTripId == null || !activeTrip || activeTrip.plannedReturnAt == null) return
    const key = `${NOTIFIED_KEY_PREFIX}${activeTripId}`

    function checkOverdue() {
      if (!activeTrip || !isTripOverdue(activeTrip.plannedReturnAt, Date.now())) return
      if (localStorage.getItem(key) === '1') return
      localStorage.setItem(key, '1')
      showLocalNotification('Wyprawa się przeciąga', {
        body: `Minął planowany czas powrotu z wyprawy "${activeTrip.name}". Jeśli wszystko OK, zakończ wyprawę - w razie problemu użyj SMS-a z lokalizacją.`,
        tag: 'lysy-overdue-trip',
      })
    }

    checkOverdue()
    const interval = setInterval(checkOverdue, CHECK_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [activeTripId, activeTrip])
}
