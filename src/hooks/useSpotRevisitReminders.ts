import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect } from 'react'
import { db } from '../db/db'
import { showLocalNotification } from '../utils/notifications'
import { monthLabel, shouldRemindRevisit } from '../utils/spotRevisit'

const NOTIFIED_KEY_PREFIX = 'lysy-spot-revisit-notified-'
const CHECK_INTERVAL_MS = 6 * 60 * 60_000 // sezonowe przypomnienie - wystarczy sprawdzać co kilka godzin, nie co godzinę jak kleszcze

// Klucz obejmuje rok, żeby to samo grzybowisko przypomniało się ponownie w kolejnym sezonie
// (rok później), zamiast zostać oznaczone jako "już powiadomiono" na zawsze po pierwszym trafieniu.
function notifiedKey(spotId: number, year: number): string {
  return `${NOTIFIED_KEY_PREFIX}${spotId}-${year}`
}

// "Sprawdź to miejsce w przyszłym sezonie" - grzybiarz oznacza grzybowisko flagą z miesiącem
// (patrz SpotManager.tsx), a ta apka przypomina lokalnym powiadomieniem (ta sama infrastruktura
// co useTickReminders), gdy nadejdzie ten miesiąc w kolejnym roku. Działa tylko, gdy apka
// zostanie otwarta w tym oknie (brak backendu = brak realnego push w tle), świadomy kompromis
// zgodny z resztą architektury offline-first tej apki.
export function useSpotRevisitReminders() {
  const spots = useLiveQuery(() => db.spots.filter((s) => s.revisitMonth != null).toArray(), [])

  useEffect(() => {
    if (!spots) return

    function checkRevisitReminders() {
      const now = Date.now()
      const year = new Date(now).getFullYear()
      for (const spot of spots ?? []) {
        if (spot.id == null || spot.revisitMonth == null || spot.revisitFlaggedAt == null) continue
        const key = notifiedKey(spot.id, year)
        if (localStorage.getItem(key)) continue
        if (!shouldRemindRevisit(spot.revisitMonth, spot.revisitFlaggedAt, now)) continue
        try {
          localStorage.setItem(key, '1')
        } catch {
          // localStorage niedostępny/pełny - przypomnienie może się powtórzyć, nie krytyczne
        }
        showLocalNotification('Czas sprawdzić grzybowisko', {
          body: `${spot.name} - oznaczone jako warte sprawdzenia w ${monthLabel(spot.revisitMonth)}.`,
          tag: `lysy-spot-revisit-${spot.id}`,
        })
      }
    }

    checkRevisitReminders()
    const interval = setInterval(checkRevisitReminders, CHECK_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [spots])
}
