import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useReturnPointTracking } from './useReturnPointTracking'
import { useAppStore } from '../stores/appStore'

describe('useReturnPointTracking', () => {
  beforeEach(() => {
    useAppStore.setState({ returnPoint: null })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('zwraca null returnPointInfo, gdy brak zapisanego punktu lub pozycji użytkownika', () => {
    const { result } = renderHook(() => useReturnPointTracking(null, vi.fn()))
    expect(result.current.returnPointInfo).toBeNull()
  })

  it('liczy dystans/kierunek do zapisanego punktu na podstawie pozycji użytkownika', () => {
    useAppStore.setState({ returnPoint: { latitude: 52.0, longitude: 19.0, savedAt: Date.now() } })

    const { result } = renderHook(() => useReturnPointTracking([52.1, 19.0], vi.fn()))

    expect(result.current.returnPointInfo).not.toBeNull()
    expect(result.current.returnPointInfo?.distanceMeters).toBeGreaterThan(0)
    // Punkt powrotu jest na południe od użytkownika (mniejsza szerokość geograficzna) - azymut
    // bliski 180°.
    expect(result.current.returnPointInfo?.bearingDegrees).toBeCloseTo(180, 0)
  })

  it('handleSaveReturnPoint zapisuje pozycję użytkownika, gdy jest dostępna (bez wywołania GPS)', async () => {
    const { result } = renderHook(() => useReturnPointTracking([52.5, 19.5], vi.fn()))

    await act(async () => {
      await result.current.handleSaveReturnPoint()
    })

    expect(useAppStore.getState().returnPoint).toMatchObject({ latitude: 52.5, longitude: 19.5 })
  })

  it('handleSaveReturnPoint zgłasza błąd przez onError, gdy brak pozycji i GPS zawiedzie', async () => {
    vi.stubGlobal('navigator', {})
    const onError = vi.fn()

    const { result } = renderHook(() => useReturnPointTracking(null, onError))

    await act(async () => {
      await result.current.handleSaveReturnPoint()
    })

    expect(onError).toHaveBeenCalledWith(expect.stringMatching(/nie jest wspierana/))
    expect(useAppStore.getState().returnPoint).toBeNull()
  })

  it('clearReturnPoint czyści zapisany punkt', () => {
    useAppStore.setState({ returnPoint: { latitude: 1, longitude: 2, savedAt: Date.now() } })
    const { result } = renderHook(() => useReturnPointTracking(null, vi.fn()))

    act(() => result.current.clearReturnPoint())

    expect(useAppStore.getState().returnPoint).toBeNull()
  })
})
