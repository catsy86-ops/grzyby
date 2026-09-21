import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect } from 'react'
import { db } from '../db/db'
import { useActiveTrip } from '../stores/useActiveTrip'
import { pushWidgetStats } from '../utils/androidWidgetBridge'
import { countSpeciesDiversity, formatDuration } from '../utils/tripStats'
import { readCachedMushroomOutlookLabel } from './useMushroomOutlook'

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
      // Niezależne od tego, czy jest aktywna wyprawa - odczyt z cache (nie sieciowy), patrz
      // uzasadnienie przy readCachedMushroomOutlookLabel. `undefined` zamiast `null`, żeby
      // pominąć pole w JSON-ie (WidgetBridge.kt czyta je przez `optString`, `undefined` w
      // JSON.stringify po prostu znika z wyniku - dokładnie to co chcemy zamiast wysyłania
      // dosłownego "null" jako tekstu).
      const mushroomOutlookLabel = readCachedMushroomOutlookLabel() ?? undefined
      if (activeTripId != null && activeTrip) {
        pushWidgetStats({
          hasActiveTrip: true,
          tripName: activeTrip.name,
          tripDurationLabel: formatDuration(activeTrip.startedAt, null),
          findingsCount: activeTripFindings?.length ?? 0,
          speciesCount: activeTripFindings ? countSpeciesDiversity(activeTripFindings) : 0,
          mushroomOutlookLabel,
        })
      } else {
        pushWidgetStats({ hasActiveTrip: false, findingsCount: 0, speciesCount: 0, mushroomOutlookLabel })
      }
    }

    push()
    // Bez aktywnej wyprawy odświeża rzadziej (10 min, nie 1 min jak licznik czasu trwania
    // wyprawy niżej) - jedyny powód do ponownego push-a w tym stanie to ewentualne świeże
    // pobranie prognozy grzybowej przez MapView w międzyczasie (cache w useMushroomOutlook.ts
    // sam odświeża się góra co kilka godzin, nie potrzeba częściej).
    const interval = setInterval(push, activeTripId != null ? 60_000 : 10 * 60_000)
    return () => clearInterval(interval)
  }, [activeTripId, activeTrip, activeTripFindings])
}
