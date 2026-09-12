import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect } from 'react'
import { db } from '../db/db'
import { useActiveTrip } from '../stores/useActiveTrip'
import { pushWidgetStats } from '../utils/androidWidgetBridge'
import { countSpeciesDiversity, formatDuration } from '../utils/tripStats'

// Utrzymuje natywny widget na ekranie głównym Androida (jeśli apka działa w otoczce
// WebView z android/) w zgodzie ze stanem aktywnej wyprawy - patrz androidWidgetBridge.ts.
// W zwykłej przeglądarce/zainstalowanym PWA pushWidgetStats jest no-opem.
export function useAndroidWidgetSync(): void {
  const { activeTripId, activeTrip } = useActiveTrip()
  const activeTripFindings = useLiveQuery(
    () => (activeTripId != null ? db.findings.where('tripId').equals(activeTripId).toArray() : []),
    [activeTripId],
  )

  useEffect(() => {
    function push() {
      if (activeTripId != null && activeTrip) {
        pushWidgetStats({
          hasActiveTrip: true,
          tripName: activeTrip.name,
          tripDurationLabel: formatDuration(activeTrip.startedAt, null),
          findingsCount: activeTripFindings?.length ?? 0,
          speciesCount: activeTripFindings ? countSpeciesDiversity(activeTripFindings) : 0,
        })
      } else {
        pushWidgetStats({ hasActiveTrip: false, findingsCount: 0, speciesCount: 0 })
      }
    }

    push()
    if (activeTripId == null) return
    // Odświeża etykietę czasu trwania w widgecie co minutę, tak jak licznik w TripManager.
    const interval = setInterval(push, 60_000)
    return () => clearInterval(interval)
  }, [activeTripId, activeTrip, activeTripFindings])
}
