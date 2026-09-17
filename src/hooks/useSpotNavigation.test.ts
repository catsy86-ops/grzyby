import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useSpotNavigation } from './useSpotNavigation'
import { useAppStore } from '../stores/appStore'
import type { Spot } from '../db/schema'

const spots: Spot[] = [
  { id: 1, name: 'Sosnowy zagajnik', latitude: 52.0, longitude: 19.0, notes: '', createdAt: 1 },
  { id: 2, name: 'Za rzeką', latitude: 53.0, longitude: 20.0, notes: '', createdAt: 2 },
]

describe('useSpotNavigation', () => {
  beforeEach(() => {
    useAppStore.setState({ navigationTargetSpotId: null })
  })

  it('zwraca null, gdy brak wybranego celu', () => {
    const { result } = renderHook(() => useSpotNavigation(null, spots))
    expect(result.current.navigationTargetSpot).toBeNull()
    expect(result.current.navigationInfo).toBeNull()
  })

  it('zwraca null navigationInfo, gdy jest cel, ale brak pozycji użytkownika', () => {
    useAppStore.setState({ navigationTargetSpotId: 1 })
    const { result } = renderHook(() => useSpotNavigation(null, spots))
    expect(result.current.navigationTargetSpot?.name).toBe('Sosnowy zagajnik')
    expect(result.current.navigationInfo).toBeNull()
  })

  it('liczy dystans/kierunek do wybranego grzybowiska na podstawie pozycji użytkownika', () => {
    useAppStore.setState({ navigationTargetSpotId: 1 })
    const { result } = renderHook(() => useSpotNavigation([52.1, 19.0], spots))

    expect(result.current.navigationInfo).not.toBeNull()
    expect(result.current.navigationInfo?.distanceMeters).toBeGreaterThan(0)
    expect(result.current.navigationInfo?.bearingDegrees).toBeCloseTo(180, 0)
  })

  it('zwraca null, gdy zapisany id celu nie odpowiada żadnemu spotowi (np. usunięty)', () => {
    useAppStore.setState({ navigationTargetSpotId: 999 })
    const { result } = renderHook(() => useSpotNavigation([52.1, 19.0], spots))
    expect(result.current.navigationTargetSpot).toBeNull()
  })

  it('setNavigationTargetSpotId ustawia cel w appStore', () => {
    const { result } = renderHook(() => useSpotNavigation(null, spots))
    act(() => result.current.setNavigationTargetSpotId(2))
    expect(useAppStore.getState().navigationTargetSpotId).toBe(2)
  })

  it('clearNavigationTarget czyści wybrany cel', () => {
    useAppStore.setState({ navigationTargetSpotId: 1 })
    const { result } = renderHook(() => useSpotNavigation(null, spots))
    act(() => result.current.clearNavigationTarget())
    expect(useAppStore.getState().navigationTargetSpotId).toBeNull()
  })
})
