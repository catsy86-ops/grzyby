import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSpotMushroomOutlook } from './useSpotMushroomOutlook'

const SPOT: [number, number] = [52.2297, 21.0122]
const CACHE_KEY = 'grzyby-spot-mushroom-outlook-cache'

function mockFetchOnce(rain: number, temp: number) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        daily: { precipitation_sum: [rain], temperature_2m_mean: [temp] },
      }),
    }),
  )
}

describe('useSpotMushroomOutlook', () => {
  beforeEach(() => {
    localStorage.clear()
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('nie pobiera, gdy enabled=false', () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)

    const { result } = renderHook(() => useSpotMushroomOutlook(1, SPOT[0], SPOT[1], false))

    expect(result.current.outlook).toBeNull()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('pobiera prognozę dla spotu, gdy enabled=true i online', async () => {
    mockFetchOnce(20, 15)

    const { result } = renderHook(() => useSpotMushroomOutlook(1, SPOT[0], SPOT[1], true))

    await waitFor(() => expect(result.current.outlook).not.toBeNull())
    expect(result.current.outlook?.score).toBe('dobry')
  })

  it('zapisuje wynik do cache pod kluczem spotId', async () => {
    mockFetchOnce(20, 15)

    renderHook(() => useSpotMushroomOutlook(42, SPOT[0], SPOT[1], true))

    await waitFor(() => expect(localStorage.getItem(CACHE_KEY)).not.toBeNull())
    const cache = JSON.parse(localStorage.getItem(CACHE_KEY)!)
    expect(cache['42'].outlook.score).toBe('dobry')
  })

  it('używa świeżego cache dla danego spotu bez wywoływania fetch', () => {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        7: {
          lat: SPOT[0],
          lon: SPOT[1],
          timestamp: Date.now(),
          outlook: { recentRainMm: 20, avgTempC: 15, score: 'dobry', label: 'Dobry czas na grzyby' },
        },
      }),
    )
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)

    const { result } = renderHook(() => useSpotMushroomOutlook(7, SPOT[0], SPOT[1], true))

    expect(result.current.outlook?.score).toBe('dobry')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('nie miesza cache różnych spotów', async () => {
    mockFetchOnce(0, 15)

    const { result } = renderHook(() => useSpotMushroomOutlook(2, 10, 10, true))

    await waitFor(() => expect(result.current.outlook).not.toBeNull())
    expect(result.current.outlook?.score).toBe('slaby')

    const cache = JSON.parse(localStorage.getItem(CACHE_KEY)!)
    expect(Object.keys(cache)).toEqual(['2'])
  })

  it('nie rzuca błędu do UI, gdy fetch zawiedzie - outlook zostaje null', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))

    const { result } = renderHook(() => useSpotMushroomOutlook(1, SPOT[0], SPOT[1], true))

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.outlook).toBeNull()
  })
})
