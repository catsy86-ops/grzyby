import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useMushroomOutlook } from './useMushroomOutlook'

const WARSAW: [number, number] = [52.2297, 21.0122]
const CACHE_KEY = 'grzyby-mushroom-outlook-cache'

function mockFetchOnce(rain: number, temp: number) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        daily: { precipitation_sum: [rain], temperature_2m_mean: [temp] },
      }),
    })
  )
}

describe('useMushroomOutlook', () => {
  beforeEach(() => {
    localStorage.clear()
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('zwraca null, gdy brak pozycji i pustego cache', () => {
    const { result } = renderHook(() => useMushroomOutlook(null))
    expect(result.current).toBeNull()
  })

  it('pobiera i zwraca wynik dla podanej pozycji, gdy online', async () => {
    mockFetchOnce(20, 15)

    const { result } = renderHook(() => useMushroomOutlook(WARSAW))

    await waitFor(() => expect(result.current).not.toBeNull())
    expect(result.current?.score).toBe('dobry')
  })

  it('zapisuje wynik do localStorage po udanym pobraniu', async () => {
    mockFetchOnce(20, 15)

    renderHook(() => useMushroomOutlook(WARSAW))

    await waitFor(() => expect(localStorage.getItem(CACHE_KEY)).not.toBeNull())
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY)!)
    expect(cached.outlook.score).toBe('dobry')
  })

  it('od razu zwraca wynik z cache przy montowaniu, zanim fetch się zakończy', () => {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        lat: WARSAW[0],
        lon: WARSAW[1],
        timestamp: Date.now(),
        outlook: { recentRainMm: 20, avgTempC: 15, score: 'dobry', label: 'Dobry czas na grzyby' },
      })
    )
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))

    const { result } = renderHook(() => useMushroomOutlook(WARSAW))

    expect(result.current?.score).toBe('dobry')
  })

  it('nie odpytuje sieci, gdy offline - zostaje przy wartości z cache', () => {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        lat: WARSAW[0],
        lon: WARSAW[1],
        timestamp: Date.now(),
        outlook: { recentRainMm: 20, avgTempC: 15, score: 'dobry', label: 'Dobry czas na grzyby' },
      })
    )
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)

    const { result } = renderHook(() => useMushroomOutlook(WARSAW))

    expect(result.current?.score).toBe('dobry')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('nie rzuca błędu do UI, gdy fetch zawiedzie - zostaje null', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))

    const { result } = renderHook(() => useMushroomOutlook(WARSAW))

    await waitFor(() => expect(vi.mocked(fetch)).toHaveBeenCalled())
    expect(result.current).toBeNull()
  })
})
