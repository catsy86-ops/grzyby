import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useBatteryStatus } from './useBatteryStatus'

describe('useBatteryStatus', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('zwraca null, gdy przeglądarka nie wspiera Battery Status API (np. Firefox/iOS)', () => {
    vi.stubGlobal('navigator', { ...navigator })
    const { result, unmount } = renderHook(() => useBatteryStatus())
    expect(result.current).toBeNull()
    unmount()
  })

  it('odczytuje poziom i stan ładowania po rozwiązaniu getBattery()', async () => {
    const listeners = new Map<string, () => void>()
    const battery = {
      level: 0.42,
      charging: false,
      addEventListener: vi.fn((event: string, handler: () => void) => listeners.set(event, handler)),
      removeEventListener: vi.fn(),
    }
    vi.stubGlobal('navigator', { ...navigator, getBattery: vi.fn().mockResolvedValue(battery) })

    const { result, unmount } = renderHook(() => useBatteryStatus())
    await act(async () => {})

    expect(result.current).toEqual({ level: 0.42, charging: false })
    unmount()
  })

  it('aktualizuje się po zdarzeniu levelchange', async () => {
    const listeners = new Map<string, () => void>()
    const battery = {
      level: 0.9,
      charging: false,
      addEventListener: vi.fn((event: string, handler: () => void) => listeners.set(event, handler)),
      removeEventListener: vi.fn(),
    }
    vi.stubGlobal('navigator', { ...navigator, getBattery: vi.fn().mockResolvedValue(battery) })

    const { result, unmount } = renderHook(() => useBatteryStatus())
    await act(async () => {})

    battery.level = 0.15
    act(() => listeners.get('levelchange')?.())

    expect(result.current).toEqual({ level: 0.15, charging: false })
    unmount()
  })
})
