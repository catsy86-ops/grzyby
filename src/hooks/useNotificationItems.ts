import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { db } from '../db/db'
import { useActiveTrip } from '../stores/useActiveTrip'
import { useAppStore } from '../stores/appStore'
import { computeNotificationItems, type NotificationItem } from '../utils/notificationCenter'

const BACKUP_SNOOZE_KEY = 'lysy-backup-reminder-snoozed-until'
// Odświeżenie "now" co minutę - warunki czasowe (przeciągająca się wyprawa, rewizyta w bieżącym
// miesiącu) inaczej nigdy by się nie zaktualizowały same z siebie: to hook zamontowany raz na
// cały czas życia App.tsx, więc jedyne, co by go re-renderowało, to zmiany danych w Dexie
// (useLiveQuery), nie sam upływ czasu. Ten sam wzorzec co TripManager.tsx/useOverdueTripReminder.ts.
const NOW_REFRESH_INTERVAL_MS = 60_000

// Współdzielone przez bell-icon w App.tsx (sam licznik, dla plakietki) i NotificationCenter.tsx
// (pełna lista) - dwie niezależne subskrypcje tych samych tabel Dexie, ten sam wzorzec co
// wielokrotne wywołania useActiveTrip() w różnych komponentach.
export function useNotificationItems(): NotificationItem[] {
  const findingsCount = useLiveQuery(() => db.findings.count(), [])
  const lastExportAt = useAppStore((s) => s.lastExportAt)
  const { activeTrip } = useActiveTrip()
  const spots = useLiveQuery(() => db.spots.toArray(), [])
  const backupSnoozedUntilRaw = localStorage.getItem(BACKUP_SNOOZE_KEY)

  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), NOW_REFRESH_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [])

  return computeNotificationItems(
    {
      findingsCount: findingsCount ?? 0,
      lastExportAt,
      backupSnoozedUntil: backupSnoozedUntilRaw ? Number(backupSnoozedUntilRaw) : null,
      activeTrip: activeTrip ?? null,
      spots: spots ?? [],
    },
    now,
  )
}
