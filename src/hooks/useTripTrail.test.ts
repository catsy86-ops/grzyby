import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useTripTrail } from './useTripTrail'
import { db } from '../db/db'

describe('useTripTrail', () => {
  beforeEach(async () => {
    await db.tripTrailPoints.clear()
  })

  afterEach(() => cleanup())

  it('zwraca pustą trasę, gdy brak aktywnej wyprawy', () => {
    const { result } = renderHook(() => useTripTrail(null, [52.0, 19.0]))
    expect(result.current.trailPoints).toEqual([])
  })

  it('zapisuje pierwszy punkt trasy od razu po pojawieniu się pozycji', async () => {
    const { result } = renderHook(() => useTripTrail(1, [52.0, 19.0]))

    await waitFor(async () => expect(await db.tripTrailPoints.where('tripId').equals(1).count()).toBe(1))
    await waitFor(() => expect(result.current.trailPoints).toEqual([[52.0, 19.0]]))
  })

  it('pomija zapis kolejnej pozycji, gdy przesunięcie jest mniejsze niż próg (~20m)', async () => {
    const { rerender } = renderHook(({ pos }: { pos: [number, number] }) => useTripTrail(1, pos), {
      initialProps: { pos: [52.0, 19.0] as [number, number] },
    })

    await waitFor(async () => expect(await db.tripTrailPoints.where('tripId').equals(1).count()).toBe(1))

    // Przesunięcie o ~1m (0.00001 stopnia) - poniżej progu throttlingu.
    rerender({ pos: [52.00001, 19.0] })

    await new Promise((r) => setTimeout(r, 20))
    expect(await db.tripTrailPoints.where('tripId').equals(1).count()).toBe(1)
  })

  it('zapisuje kolejny punkt po przesunięciu o więcej niż próg', async () => {
    const { rerender } = renderHook(({ pos }: { pos: [number, number] }) => useTripTrail(1, pos), {
      initialProps: { pos: [52.0, 19.0] as [number, number] },
    })

    await waitFor(async () => expect(await db.tripTrailPoints.where('tripId').equals(1).count()).toBe(1))

    // Przesunięcie o ok. 100m w kierunku północnym.
    rerender({ pos: [52.0009, 19.0] })

    await waitFor(async () => expect(await db.tripTrailPoints.where('tripId').equals(1).count()).toBe(2))
  })

  it('resetuje throttling przy zmianie aktywnej wyprawy', async () => {
    const { rerender } = renderHook(
      ({ tripId, pos }: { tripId: number | null; pos: [number, number] }) => useTripTrail(tripId, pos),
      { initialProps: { tripId: 1, pos: [52.0, 19.0] as [number, number] } },
    )

    await waitFor(async () => expect(await db.tripTrailPoints.where('tripId').equals(1).count()).toBe(1))

    act(() => {
      rerender({ tripId: 2, pos: [52.0, 19.0] })
    })

    await waitFor(async () => expect(await db.tripTrailPoints.where('tripId').equals(2).count()).toBe(1))
  })
})
