import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CompassPanel } from './CompassPanel'

describe('CompassPanel', () => {
  const originalDeviceOrientationEvent = (globalThis as { DeviceOrientationEvent?: unknown }).DeviceOrientationEvent

  afterEach(() => {
    cleanup()
    ;(globalThis as { DeviceOrientationEvent?: unknown }).DeviceOrientationEvent = originalDeviceOrientationEvent
  })

  it('pokazuje komunikat o braku wsparcia, gdy przeglądarka nie ma czujnika kierunku', () => {
    delete (globalThis as { DeviceOrientationEvent?: unknown }).DeviceOrientationEvent

    render(<CompassPanel open onOpenChange={vi.fn()} targets={[]} isPositionStale={false} />)

    expect(screen.getByText(/nie udostępnia czujnika kierunku/)).toBeInTheDocument()
  })

  it('pokazuje tarczę kompasu i cele nawigacji, gdy dostęp jest przyznany', () => {
    class FakeDeviceOrientationEvent extends Event {}
    ;(globalThis as { DeviceOrientationEvent?: unknown }).DeviceOrientationEvent = FakeDeviceOrientationEvent

    render(
      <CompassPanel
        open
        onOpenChange={vi.fn()}
        targets={[{ label: 'Auto', distanceMeters: 250, bearingDegrees: 90 }]}
        isPositionStale={false}
      />,
    )

    expect(screen.getByText('Auto')).toBeInTheDocument()
    expect(screen.queryByText(/Sygnał GPS mógł zostać utracony/)).not.toBeInTheDocument()
  })

  it('pokazuje ostrzeżenie o nieaktualnej pozycji GPS przy liście celów', () => {
    class FakeDeviceOrientationEvent extends Event {}
    ;(globalThis as { DeviceOrientationEvent?: unknown }).DeviceOrientationEvent = FakeDeviceOrientationEvent

    render(
      <CompassPanel
        open
        onOpenChange={vi.fn()}
        targets={[{ label: 'Auto', distanceMeters: 250, bearingDegrees: 90 }]}
        isPositionStale
      />,
    )

    expect(screen.getByText(/Sygnał GPS mógł zostać utracony/)).toBeInTheDocument()
  })
})
