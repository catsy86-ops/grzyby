import { afterEach, describe, expect, it, vi } from 'vitest'
import { getCurrentPosition } from './geolocation'

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
