import { renderHook, act } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useMediaQuery } from './useMediaQuery'

function createMatchMedia(initialMatches: boolean) {
  let matches = initialMatches
  let changeHandler: ((event: MediaQueryListEvent) => void) | null = null

  const mql = {
    get matches() {
      return matches
    },
    media: '',
    addEventListener: vi.fn((event: string, handler: (event: MediaQueryListEvent) => void) => {
      if (event === 'change') changeHandler = handler
    }),
    removeEventListener: vi.fn(),
  }

  return {
    matchMedia: vi.fn(() => mql as unknown as MediaQueryList),
    fireChange: (nextMatches: boolean) => {
      matches = nextMatches
      changeHandler?.({ matches: nextMatches } as MediaQueryListEvent)
    },
  }
}

describe('useMediaQuery', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('zwraca początkowy wynik matchMedia', () => {
    const { matchMedia } = createMatchMedia(true)
    vi.stubGlobal('matchMedia', matchMedia)

    const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'))

    expect(result.current).toBe(true)
    expect(matchMedia).toHaveBeenCalledWith('(min-width: 768px)')
  })

  it('aktualizuje się po zdarzeniu "change"', () => {
    const { matchMedia, fireChange } = createMatchMedia(false)
    vi.stubGlobal('matchMedia', matchMedia)

    const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'))
    expect(result.current).toBe(false)

    act(() => {
      fireChange(true)
    })

    expect(result.current).toBe(true)
  })

  it('odpina listener przy odmontowaniu', () => {
    const { matchMedia } = createMatchMedia(false)
    vi.stubGlobal('matchMedia', matchMedia)

    const { unmount } = renderHook(() => useMediaQuery('(min-width: 768px)'))
    const mql = matchMedia.mock.results[0]!.value as { removeEventListener: ReturnType<typeof vi.fn> }

    unmount()

    expect(mql.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function))
  })
})
