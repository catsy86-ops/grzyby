import { afterEach, describe, expect, it, vi } from 'vitest'
import { pushWidgetStats } from './androidWidgetBridge'

describe('pushWidgetStats', () => {
  afterEach(() => {
    delete window.AndroidWidget
  })

  it('nic nie robi poza natywną otoczką Androida (brak window.AndroidWidget)', () => {
    expect(() => pushWidgetStats({ hasActiveTrip: false, findingsCount: 0, speciesCount: 0 })).not.toThrow()
  })

  it('przekazuje statystyki jako JSON do window.AndroidWidget.updateStats', () => {
    const updateStats = vi.fn()
    window.AndroidWidget = { updateStats }

    pushWidgetStats({
      hasActiveTrip: true,
      tripName: 'Test',
      tripDurationLabel: '1 godz.',
      findingsCount: 3,
      speciesCount: 2,
    })

    expect(updateStats).toHaveBeenCalledWith(
      JSON.stringify({
        hasActiveTrip: true,
        tripName: 'Test',
        tripDurationLabel: '1 godz.',
        findingsCount: 3,
        speciesCount: 2,
      }),
    )
  })
})
