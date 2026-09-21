import { useMemo } from 'react'
import type { BearingInfo, Position } from '../utils/bearing'
import { getBearingInfo } from '../utils/bearing'
import { useAppStore } from '../stores/appStore'
import type { Spot } from '../db/schema'

export type SpotNavigationInfo = BearingInfo

export interface UseSpotNavigationResult {
  navigationTargetSpot: Spot | null
  navigationInfo: SpotNavigationInfo | null
  setNavigationTargetSpotId: (id: number | null) => void
  clearNavigationTarget: () => void
}

// Nawigacja (dystans/kierunek) do zapisanego grzybowiska - analogiczne do
// useReturnPointTracking, ale cel to jeden z `spots` zamiast auta. Tylko jeden spot może być
// celem naraz (jak jeden punkt powrotu), przechowywany jako id w appStore żeby przetrwał
// zabicie aplikacji w trakcie wyprawy.
export function useSpotNavigation(
  userPosition: Position | null,
  spots: Spot[] | undefined,
): UseSpotNavigationResult {
  const navigationTargetSpotId = useAppStore((s) => s.navigationTargetSpotId)
  const setNavigationTargetSpotId = useAppStore((s) => s.setNavigationTargetSpotId)

  const navigationTargetSpot = useMemo(() => {
    if (navigationTargetSpotId == null) return null
    return spots?.find((spot) => spot.id === navigationTargetSpotId) ?? null
  }, [spots, navigationTargetSpotId])

  const navigationInfo = useMemo(() => {
    if (!navigationTargetSpot || !userPosition) return null
    const targetPosition: Position = [navigationTargetSpot.latitude, navigationTargetSpot.longitude]
    return getBearingInfo(userPosition, targetPosition)
  }, [navigationTargetSpot, userPosition])

  function clearNavigationTarget() {
    setNavigationTargetSpotId(null)
  }

  return { navigationTargetSpot, navigationInfo, setNavigationTargetSpotId, clearNavigationTarget }
}
