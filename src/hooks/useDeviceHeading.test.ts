import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useDeviceHeading } from './useDeviceHeading'

describe('useDeviceHeading', () => {
  const originalDeviceOrientationEvent = (globalThis as { DeviceOrientationEvent?: unknown }).DeviceOrientationEvent

  afterEach(() => {
    ;(globalThis as { DeviceOrientationEvent?: unknown }).DeviceOrientationEvent = originalDeviceOrientationEvent
    vi.restoreAllMocks()
  })

  it('zgłasza "unsupported", gdy przeglądarka nie ma DeviceOrientationEvent', () => {
    delete (globalThis as { DeviceOrientationEvent?: unknown }).DeviceOrientationEvent

    const { result } = renderHook(() => useDeviceHeading())

    expect(result.current.permissionState).toBe('unsupported')
    expect(result.current.headingDegrees).toBeNull()
  })

  it('wchodzi w stan "granted" od razu, gdy przeglądarka nie wymaga promptu (Android/Chrome)', () => {
    class FakeDeviceOrientationEvent extends Event {}
    ;(globalThis as { DeviceOrientationEvent?: unknown }).DeviceOrientationEvent = FakeDeviceOrientationEvent

    const { result } = renderHook(() => useDeviceHeading())

    expect(result.current.permissionState).toBe('granted')
  })

  it('wymaga jawnej zgody (iOS 13+) i przechodzi w "denied" po odmowie', async () => {
    class FakeDeviceOrientationEvent extends Event {
      static requestPermission = vi.fn().mockResolvedValue('denied')
    }
    ;(globalThis as { DeviceOrientationEvent?: unknown }).DeviceOrientationEvent = FakeDeviceOrientationEvent

    const { result } = renderHook(() => useDeviceHeading())
    expect(result.current.permissionState).toBe('prompt')

    await act(async () => {
      await result.current.requestPermission()
    })

    expect(result.current.permissionState).toBe('denied')
  })

  it('odczytuje kierunek z webkitCompassHeading (iOS) po dopuszczeniu', async () => {
    class FakeDeviceOrientationEvent extends Event {
      static requestPermission = vi.fn().mockResolvedValue('granted')
    }
    ;(globalThis as { DeviceOrientationEvent?: unknown }).DeviceOrientationEvent = FakeDeviceOrientationEvent

    const { result } = renderHook(() => useDeviceHeading())
    await act(async () => {
      await result.current.requestPermission()
    })
    expect(result.current.permissionState).toBe('granted')

    act(() => {
      const event = new Event('deviceorientation') as Event & { webkitCompassHeading?: number }
      event.webkitCompassHeading = 90
      window.dispatchEvent(event)
    })

    expect(result.current.headingDegrees).toBe(90)
  })
})
