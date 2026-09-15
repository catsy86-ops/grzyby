import { useEffect, useRef, useState } from 'react'
import type { Position } from '../utils/bearing'
import { watchPosition } from '../utils/geolocation'

// Pozycja uznawana za "nieaktualną", gdy od ostatniej aktualizacji GPS minęło więcej niż ten
// próg - np. sygnał zgubiony pod gęstym listowiem. Marker pozycji dostaje wtedy wizualny sygnał
// "to nie jest Twoje 'teraz'" zamiast milcząco pokazywać ostatnie znane miejsce jako aktualne.
const STALE_POSITION_MS = 20_000

export interface UseMapGeolocationResult {
  userPosition: Position | null
  userAccuracyMeters: number | null
  recenterTarget: Position | null
  locateError: string | null
  /** `true`, gdy `userPosition` nie był odświeżony od dłuższego czasu (utrata sygnału GPS). */
  isPositionStale: boolean
  handleLocate: () => void
  clearLocateError: () => void
  /** Zgłasza błąd z zewnątrz (np. z zapisu punktu powrotu) do tego samego, jedynego stosu
   * komunikatów co błędy GPS - jedno źródło prawdy dla `MapOverlayMessages`. */
  reportError: (message: string) => void
}

// Cały stan/efekt śledzenia GPS wydzielony z MapView - czysta logika, testowalna bez
// zależności od Leaflet/MapContainer. Ciągłe śledzenie (watchPosition) zamiast jednorazowego
// odpytania - pierwszy odczyt z odbiornika bywa niedokładny, kolejne z tego samego strumienia
// szybko się poprawiają, a użytkownik w ruchu (np. wracając przez las) widzi aktualizującą się
// pozycję bez ręcznego odświeżania. Mapa centruje się automatycznie tylko przy pierwszym
// odczycie po wejściu na zakładkę - kolejne aktualizacje przesuwają tylko marker/koło dokładności.
export function useMapGeolocation(): UseMapGeolocationResult {
  const [userPosition, setUserPosition] = useState<Position | null>(null)
  const [userAccuracyMeters, setUserAccuracyMeters] = useState<number | null>(null)
  const [recenterTarget, setRecenterTarget] = useState<Position | null>(null)
  const [locateError, setLocateError] = useState<string | null>(null)
  const [isPositionStale, setIsPositionStale] = useState(false)
  const lastUpdateAtRef = useRef<number | null>(null)

  useEffect(() => {
    let hasCenteredOnFirstFix = false
    const stopWatching = watchPosition(
      (position) => {
        const next: Position = [position.latitude, position.longitude]
        lastUpdateAtRef.current = Date.now()
        setUserPosition(next)
        setUserAccuracyMeters(position.accuracyMeters)
        setLocateError(null)
        setIsPositionStale(false)
        if (!hasCenteredOnFirstFix) {
          hasCenteredOnFirstFix = true
          setRecenterTarget(next)
        }
      },
      (message) => setLocateError(message),
    )

    // Sprawdzane niezależnie od tego, czy w ogóle nadejdzie kolejny błąd - watchPosition
    // z `maximumAge` potrafi po prostu przestać wołać `onUpdate` (np. telefon w kieszeni,
    // słaby sygnał), bez wyraźnego błędu, który ustawiłby `locateError`.
    const staleCheckInterval = setInterval(() => {
      if (lastUpdateAtRef.current == null) return
      setIsPositionStale(Date.now() - lastUpdateAtRef.current > STALE_POSITION_MS)
    }, 5000)

    return () => {
      stopWatching()
      clearInterval(staleCheckInterval)
    }
  }, [])

  function handleLocate() {
    setLocateError(null)
    if (userPosition) setRecenterTarget([userPosition[0], userPosition[1]])
  }

  function clearLocateError() {
    setLocateError(null)
  }

  return {
    userPosition,
    userAccuracyMeters,
    recenterTarget,
    locateError,
    isPositionStale,
    handleLocate,
    clearLocateError,
    reportError: setLocateError,
  }
}
