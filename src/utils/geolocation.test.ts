import { afterEach, describe, expect, it, vi } from 'vitest'
import { getCurrentPosition, watchPosition } from './geolocation'

function mockGeolocation(
  behavior: (
    success: PositionCallback,
    error: PositionErrorCallback | null | undefined,
  ) => void,
) {
  vi.stubGlobal('navigator', {
    ...navigator,
    geolocation: { getCurrentPosition: vi.fn(behavior) },
  })
}

function mockWatchGeolocation(
  behavior: (
    success: PositionCallback,
    error: PositionErrorCallback | null | undefined,
  ) => void,
  clearWatch: (id: number) => void = () => {},
) {
  vi.stubGlobal('navigator', {
    ...navigator,
    geolocation: {
      watchPosition: vi.fn((success, error) => {
        behavior(success, error)
        return 42
      }),
      clearWatch: vi.fn(clearWatch),
    },
  })
}

function makePositionError(code: number): GeolocationPositionError {
  return {
    code,
    message: 'mock',
    PERMISSION_DENIED: 1,
    POSITION_UNAVAILABLE: 2,
    TIMEOUT: 3,
  } as GeolocationPositionError
}

describe('getCurrentPosition', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('zwraca współrzędne przy sukcesie', async () => {
    mockGeolocation((success) => {
      success({ coords: { latitude: 52.1, longitude: 19.5 } } as GeolocationPosition)
    })

    await expect(getCurrentPosition()).resolves.toEqual({ latitude: 52.1, longitude: 19.5 })
  })

  it('odrzuca z komunikatem o braku zgody dla PERMISSION_DENIED', async () => {
    mockGeolocation((_success, error) => error?.(makePositionError(1)))

    await expect(getCurrentPosition()).rejects.toThrow(/zgody na dostęp do lokalizacji/)
  })

  it('odrzuca z komunikatem o niedostępnej pozycji dla POSITION_UNAVAILABLE', async () => {
    mockGeolocation((_success, error) => error?.(makePositionError(2)))

    await expect(getCurrentPosition()).rejects.toThrow(/brak sygnału GPS/)
  })

  it('odrzuca z komunikatem o przekroczonym czasie dla TIMEOUT', async () => {
    mockGeolocation((_success, error) => error?.(makePositionError(3)))

    await expect(getCurrentPosition()).rejects.toThrow(/trwało zbyt długo/)
  })

  it('odrzuca, gdy geolokalizacja nie jest wspierana', async () => {
    vi.stubGlobal('navigator', {})

    await expect(getCurrentPosition()).rejects.toThrow(/nie jest wspierana/)
  })
})

describe('watchPosition', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('wywołuje onUpdate ze współrzędnymi i dokładnością przy każdym odczycie', () => {
    mockWatchGeolocation((success) => {
      success({ coords: { latitude: 52.1, longitude: 19.5, accuracy: 12 } } as GeolocationPosition)
    })
    const onUpdate = vi.fn()

    watchPosition(onUpdate, vi.fn())

    expect(onUpdate).toHaveBeenCalledWith({ latitude: 52.1, longitude: 19.5, accuracyMeters: 12 })
  })

  it('wywołuje onError z opisowym komunikatem przy błędzie', () => {
    mockWatchGeolocation((_success, error) => error?.(makePositionError(1)))
    const onError = vi.fn()

    watchPosition(vi.fn(), onError)

    expect(onError).toHaveBeenCalledWith(expect.stringMatching(/zgody na dostęp do lokalizacji/))
  })

  it('wywołuje onError, gdy geolokalizacja nie jest wspierana, i zwraca no-op cleanup', () => {
    vi.stubGlobal('navigator', {})
    const onError = vi.fn()

    const stop = watchPosition(vi.fn(), onError)

    expect(onError).toHaveBeenCalledWith(expect.stringMatching(/nie jest wspierana/))
    expect(() => stop()).not.toThrow()
  })

  it('zwraca funkcję czyszczącą, która wywołuje clearWatch z id obserwacji', () => {
    const clearWatch = vi.fn()
    mockWatchGeolocation(() => {}, clearWatch)

    const stop = watchPosition(vi.fn(), vi.fn())
    stop()

    expect(clearWatch).toHaveBeenCalledWith(42)
  })
})
