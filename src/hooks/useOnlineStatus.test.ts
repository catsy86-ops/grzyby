import { renderHook, act } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useOnlineStatus } from './useOnlineStatus'

describe('useOnlineStatus', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('zwraca navigator.onLine jako stan początkowy', () => {
    vi.stubGlobal('navigator', { ...navigator, onLine: false })
    const { result } = renderHook(() => useOnlineStatus())
    expect(result.current).toBe(false)
  })

  it('aktualizuje się po zdarzeniu "offline"', () => {
    vi.stubGlobal('navigator', { ...navigator, onLine: true })
    const { result } = renderHook(() => useOnlineStatus())
    expect(result.current).toBe(true)

    act(() => {
      window.dispatchEvent(new Event('offline'))
    })

    expect(result.current).toBe(false)
  })

  it('aktualizuje się po zdarzeniu "online"', () => {
    vi.stubGlobal('navigator', { ...navigator, onLine: false })
    const { result } = renderHook(() => useOnlineStatus())
    expect(result.current).toBe(false)

    act(() => {
      window.dispatchEvent(new Event('online'))
    })

    expect(result.current).toBe(true)
  })
})
