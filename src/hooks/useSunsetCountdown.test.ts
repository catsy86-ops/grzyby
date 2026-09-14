import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useSunsetCountdown } from './useSunsetCountdown'

const WARSAW: [number, number] = [52.2297, 21.0122]

describe('useSunsetCountdown', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('zwraca null, gdy brak pozycji', () => {
    const { result } = renderHook(() => useSunsetCountdown(null))
    expect(result.current).toBeNull()
  })

  it('zwraca etykietę i isUrgent=false, gdy do zachodu daleko', () => {
    vi.useFakeTimers()
    // południe w przesilenie letnie w Warszawie - dużo czasu do zachodu
    vi.setSystemTime(new Date(Date.UTC(2026, 5, 21, 12, 0)))

    const { result } = renderHook(() => useSunsetCountdown(WARSAW))

    expect(result.current).not.toBeNull()
    expect(result.current?.isUrgent).toBe(false)
    expect(result.current?.label).toMatch(/godz\.|min/)
  })

  it('zwraca isUrgent=true, gdy do zachodu mniej niż godzina', () => {
    vi.useFakeTimers()
    // ok. 30 min przed zachodem w przesilenie letnie (zachód ok. 19:03 UTC)
    vi.setSystemTime(new Date(Date.UTC(2026, 5, 21, 18, 35)))

    const { result } = renderHook(() => useSunsetCountdown(WARSAW))

    expect(result.current).not.toBeNull()
    expect(result.current?.isUrgent).toBe(true)
  })

  it('zwraca null, gdy słońce już zaszło', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(Date.UTC(2026, 5, 21, 23, 0)))

    const { result } = renderHook(() => useSunsetCountdown(WARSAW))

    expect(result.current).toBeNull()
  })
})
