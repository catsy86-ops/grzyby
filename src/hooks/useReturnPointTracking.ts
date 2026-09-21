import { useMemo } from 'react'
import type { BearingInfo, Position } from '../utils/bearing'
import { getBearingInfo } from '../utils/bearing'
import { getCurrentPosition } from '../utils/geolocation'
import { useAppStore } from '../stores/appStore'

export type ReturnPointInfo = BearingInfo

export interface UseReturnPointTrackingResult {
  returnPoint: ReturnType<typeof useAppStore.getState>['returnPoint']
  returnPointInfo: ReturnPointInfo | null
  handleSaveReturnPoint: () => Promise<void>
  clearReturnPoint: () => void
}

// Punkt powrotu (np. zaparkowane auto) + dystans/kierunek do niego - wydzielone z MapView,
// żeby dało się testować bez zależności od Leaflet. `userPosition` przychodzi z zewnątrz
// (useMapGeolocation) zamiast być duplikowane tutaj. Błędy zgłaszane przez `onError` zamiast
// osobnego stanu - MapView łączy je z tym samym stosem komunikatów co błędy GPS
// (jeden priorytetowy komunikat w rogu mapy, nie dwa niezależne źródła prawdy).
export function useReturnPointTracking(
  userPosition: Position | null,
  onError: (message: string) => void,
): UseReturnPointTrackingResult {
  const returnPoint = useAppStore((s) => s.returnPoint)
  const setReturnPoint = useAppStore((s) => s.setReturnPoint)

  // Dystans/kierunek liczone wyłącznie z GPS (patrz utils/bearing.ts) - odświeżają się same przy
  // każdej aktualizacji userPosition (np. po "Zlokalizuj mnie" w trakcie powrotu przez las).
  const returnPointInfo = useMemo(() => {
    if (!returnPoint || !userPosition) return null
    const returnPosition: Position = [returnPoint.latitude, returnPoint.longitude]
    return getBearingInfo(userPosition, returnPosition)
  }, [returnPoint, userPosition])

  async function handleSaveReturnPoint() {
    try {
      const coords = userPosition
        ? { latitude: userPosition[0], longitude: userPosition[1] }
        : await getCurrentPosition()
      setReturnPoint({ latitude: coords.latitude, longitude: coords.longitude, savedAt: Date.now() })
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Nie udało się ustalić lokalizacji')
    }
  }

  function clearReturnPoint() {
    setReturnPoint(null)
  }

  return { returnPoint, returnPointInfo, handleSaveReturnPoint, clearReturnPoint }
}
