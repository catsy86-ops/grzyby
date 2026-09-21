import { useEffect, useRef } from 'react'
import { db } from '../db/db'
import { pruneTripNotificationKeys } from '../utils/pruneTripNotifications'

// Uruchamia porządkowanie localStorage (patrz utils/pruneTripNotifications.ts) raz na start
// apki, nie przy każdym renderze/zmianie danych - to porządek, nie funkcja czasu rzeczywistego,
// więc nie potrzebuje `useLiveQuery` śledzącego każdą zmianę w `db.trips`.
export function useTripNotificationCleanup() {
  const hasRunRef = useRef(false)

  useEffect(() => {
    if (hasRunRef.current) return
    hasRunRef.current = true
    void db.trips
      .toCollection()
      .primaryKeys()
      .then((ids) => pruneTripNotificationKeys(new Set(ids as number[])))
  }, [])
}
