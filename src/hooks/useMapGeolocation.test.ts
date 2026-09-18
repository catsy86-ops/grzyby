import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useMapGeolocation } from './useMapGeolocation'

function mockWatchGeolocation(
  behavior: (success: PositionCallback, error: PositionErrorCallback | null | undefined) => void,
) {
  const watchPositionSpy = vi.fn(
    (
      success: PositionCallback,
      error: PositionErrorCallback | null | undefined,
      _options?: PositionOptions,
    ) => {
      behavior(success, error)
      return 1
    },
  )
  const clearWatchSpy = vi.fn()
  vi.stubGlobal('navigator', {
    ...navigator,
    geolocation: {
      watchPosition: watchPositionSpy,
      clearWatch: clearWatchSpy,
    },
  })
  return { watchPositionSpy, clearWatchSpy }
}

function setDocumentVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true })
  document.dispatchEvent(new Event('visibilitychange'))
}

describe('useMapGeolocation', () => {
  // `unmount()` wywoływane jawnie w każdym teście, PRZED odpięciem stubów - efekt czyszczący
  // hooka (watchPosition -> clearWatch) potrzebuje zamockowanego `navigator.geolocation` w
  // momencie odmontowania. Automatyczne sprzątanie z @testing-library/react uruchamia się w
  // zewnętrznym (globalnym) afterEach PO tym lokalnym - gdyby stuby zdjąć tutaj wcześniej,
  // odmontowanie trafiłoby na prawdziwy `navigator` jsdom bez `geolocation` i rzuciło wyjątek.
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
  })

  it('zaczyna bez pozycji i bez błędu', () => {
    mockWatchGeolocation(() => {})

    const { result, unmount } = renderHook(() => useMapGeolocation())

    expect(result.current.userPosition).toBeNull()
    expect(result.current.locateError).toBeNull()
    expect(result.current.isPositionStale).toBe(false)
    unmount()
  })

  it('aktualizuje pozycję/dokładność i centruje mapę tylko przy pierwszym odczycie', () => {
    let emit: PositionCallback = () => {}
    mockWatchGeolocation((success) => {
      emit = success
    })

    const { result, unmount } = renderHook(() => useMapGeolocation())

    act(() => {
      emit({ coords: { latitude: 52.1, longitude: 19.5, accuracy: 10 } } as GeolocationPosition)
    })
    expect(result.current.userPosition).toEqual([52.1, 19.5])
    expect(result.current.userAccuracyMeters).toBe(10)
    expect(result.current.recenterTarget).toEqual([52.1, 19.5])

    act(() => {
      emit({ coords: { latitude: 52.2, longitude: 19.6, accuracy: 8 } } as GeolocationPosition)
    })
    // Drugi odczyt aktualizuje pozycję, ale NIE przesuwa `recenterTarget` - mapa centruje się
    // automatycznie tylko raz, kolejne ticki GPS nie mają wywoływać przeskoku widoku.
    expect(result.current.userPosition).toEqual([52.2, 19.6])
    expect(result.current.recenterTarget).toEqual([52.1, 19.5])
    unmount()
  })

  it('handleLocate ustawia recenterTarget na aktualną pozycję', () => {
    let emit: PositionCallback = () => {}
    mockWatchGeolocation((success) => {
      emit = success
    })
    const { result, unmount } = renderHook(() => useMapGeolocation())
    act(() => emit({ coords: { latitude: 1, longitude: 2, accuracy: 5 } } as GeolocationPosition))
    act(() => emit({ coords: { latitude: 3, longitude: 4, accuracy: 5 } } as GeolocationPosition))

    act(() => result.current.handleLocate())

    expect(result.current.recenterTarget).toEqual([3, 4])
    unmount()
  })

  it('reportError i clearLocateError sterują locateError niezależnie od GPS', () => {
    mockWatchGeolocation(() => {})
    const { result, unmount } = renderHook(() => useMapGeolocation())

    act(() => result.current.reportError('błąd zewnętrzny'))
    expect(result.current.locateError).toBe('błąd zewnętrzny')

    act(() => result.current.clearLocateError())
    expect(result.current.locateError).toBeNull()
    unmount()
  })

  it('oznacza pozycję jako nieaktualną, gdy GPS nie odświeżył się od dłuższego czasu', () => {
    vi.useFakeTimers()
    let emit: PositionCallback = () => {}
    mockWatchGeolocation((success) => {
      emit = success
    })
    const { result, unmount } = renderHook(() => useMapGeolocation())

    act(() => emit({ coords: { latitude: 1, longitude: 2, accuracy: 5 } } as GeolocationPosition))
    expect(result.current.isPositionStale).toBe(false)

    act(() => {
      vi.advanceTimersByTime(25_000)
    })
    expect(result.current.isPositionStale).toBe(true)

    // Kolejny odczyt z GPS natychmiast czyści flagę nieaktualności.
    act(() => emit({ coords: { latitude: 1, longitude: 2, accuracy: 5 } } as GeolocationPosition))
    expect(result.current.isPositionStale).toBe(false)
    unmount()
  })

  it('wstrzymuje watchPosition, gdy karta przechodzi w tło, i wznawia po powrocie', () => {
    const { clearWatchSpy, watchPositionSpy } = mockWatchGeolocation(() => {})
    const { unmount } = renderHook(() => useMapGeolocation())

    expect(watchPositionSpy).toHaveBeenCalledOnce()

    act(() => setDocumentVisibility('hidden'))
    expect(clearWatchSpy).toHaveBeenCalledOnce()

    act(() => setDocumentVisibility('visible'))
    expect(watchPositionSpy).toHaveBeenCalledTimes(2)

    unmount()
  })

  it('używa niższej dokładności GPS i większego maximumAge, gdy powerSave=true', () => {
    const { watchPositionSpy } = mockWatchGeolocation(() => {})
    const { unmount } = renderHook(() => useMapGeolocation(true))

    const options = watchPositionSpy.mock.calls[0][2]
    expect(options).toMatchObject({ enableHighAccuracy: false, maximumAge: 20000 })
    unmount()
  })

  it('używa wysokiej dokładności GPS domyślnie (powerSave=false)', () => {
    const { watchPositionSpy } = mockWatchGeolocation(() => {})
    const { unmount } = renderHook(() => useMapGeolocation(false))

    const options = watchPositionSpy.mock.calls[0][2]
    expect(options).toMatchObject({ enableHighAccuracy: true, maximumAge: 5000 })
    unmount()
  })

  it('nie gubi ostatniej pozycji podczas wstrzymania GPS w tle', () => {
    let emit: PositionCallback = () => {}
    mockWatchGeolocation((success) => {
      emit = success
    })
    const { result, unmount } = renderHook(() => useMapGeolocation())

    act(() => emit({ coords: { latitude: 1, longitude: 2, accuracy: 5 } } as GeolocationPosition))
    act(() => setDocumentVisibility('hidden'))

    expect(result.current.userPosition).toEqual([1, 2])
    unmount()
  })
})
