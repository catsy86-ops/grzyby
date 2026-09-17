import { useEffect, useRef } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import type { Position } from '../utils/bearing'
import { getDistanceMeters } from '../utils/bearing'

// Poniżej tego dystansu od ostatniego zapisanego punktu nowa pozycja jest pomijana - throttling
// zapisu (nie co tick GPS, ale co ok. 20m przebytej drogi), żeby długa wieloogodzinna wyprawa
// (koncept `useActiveTrip`) nie zapchała IndexedDB tysiącami niemal identycznych punktów przy
// stojącym w miejscu użytkowniku czy szumie odbiornika GPS.
const MIN_RECORD_DISTANCE_METERS = 20

export interface UseTripTrailResult {
  /** Punkty śladu aktywnej wyprawy w kolejności chronologicznej, do narysowania jako Polyline. */
  trailPoints: Position[]
}

// Zapisuje ślad GPS podczas aktywnej wyprawy do IndexedDB i zwraca go do narysowania na mapie.
// `userPosition` przychodzi z zewnątrz (useMapGeolocation), jak w useReturnPointTracking -
// jedno źródło prawdy o pozycji, nie duplikowane tutaj.
export function useTripTrail(activeTripId: number | null, userPosition: Position | null): UseTripTrailResult {
  const lastRecordedRef = useRef<Position | null>(null)

  const trailRows = useLiveQuery(
    () =>
      activeTripId != null
        ? db.tripTrailPoints.where('tripId').equals(activeTripId).sortBy('createdAt')
        : [],
    [activeTripId],
  )

  // Nowa (lub zakończona) wyprawa - throttling dystansu liczy się od zera, nie od ostatniego
  // punktu poprzedniej wyprawy. Po remoncie MapView w trakcie już trwającej wyprawy (np.
  // przełączenie widoku listy/mapy) odzyskujemy ostatni już zapisany punkt TEJ wyprawy wprost z
  // bazy (jednorazowe zapytanie, nie reaktywny `trailRows`) - `trailRows` z useLiveQuery bywa
  // chwilę "stary" (dane poprzedniej wyprawy) tuż po zmianie `activeTripId`, więc seedowanie z
  // niego w osobnym efekcie potrafiło nadpisać świeżo wyzerowany ref danymi cudzej wyprawy.
  useEffect(() => {
    lastRecordedRef.current = null
    if (activeTripId == null) return

    let cancelled = false
    db.tripTrailPoints
      .where('tripId')
      .equals(activeTripId)
      .sortBy('createdAt')
      .then((rows) => {
        // `lastRecordedRef.current` mogło już zostać ustawione w międzyczasie (efekt zapisu
        // zdążył dodać świeższy punkt, zanim to zapytanie się rozwiązało) - nie cofamy go do
        // starszej wartości.
        if (cancelled || rows.length === 0 || lastRecordedRef.current) return
        const last = rows[rows.length - 1]
        lastRecordedRef.current = [last.latitude, last.longitude]
      })
    return () => {
      cancelled = true
    }
  }, [activeTripId])

  useEffect(() => {
    if (activeTripId == null || !userPosition) return

    const last = lastRecordedRef.current
    if (last && getDistanceMeters(last, userPosition) < MIN_RECORD_DISTANCE_METERS) return

    lastRecordedRef.current = userPosition
    void db.tripTrailPoints.add({
      tripId: activeTripId,
      latitude: userPosition[0],
      longitude: userPosition[1],
      createdAt: Date.now(),
    })
  }, [activeTripId, userPosition])

  const trailPoints: Position[] = trailRows?.map((row) => [row.latitude, row.longitude]) ?? []

  return { trailPoints }
}
