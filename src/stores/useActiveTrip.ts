import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { useAppStore } from './appStore'

export function useActiveTrip() {
  const activeTripId = useAppStore((s) => s.activeTripId)
  const activeTrip = useLiveQuery(
    () => (activeTripId != null ? db.trips.get(activeTripId) : undefined),
    [activeTripId],
  )
  return { activeTripId, activeTrip }
}
