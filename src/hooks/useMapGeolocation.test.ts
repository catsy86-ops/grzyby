import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useMapGeolocation } from './useMapGeolocation'

function mockWatchGeolocation(
  behavior: (success: PositionCallback, error: PositionErrorCallback | null | undefined) => void,
) {
  vi.stubGlobal('navigator', {
    ...navigator,
    geolocation: {
      watchPosition: vi.fn((success, error) => {
        behavior(success, error)
        return 1
      }),
      clearWatch: vi.fn(),
    },
  })
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
})
