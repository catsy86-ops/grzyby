import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../db/db'
import { useAppStore } from '../stores/appStore'
import { useAndroidWidgetSync } from './useAndroidWidgetSync'

beforeEach(async () => {
  await db.trips.clear()
  await db.findings.clear()
  useAppStore.setState({ activeTripId: null })
  delete window.AndroidWidget
})

describe('useAndroidWidgetSync', () => {
  it('wysyła hasActiveTrip: false, gdy nie ma aktywnej wyprawy', async () => {
    const updateStats = vi.fn()
    window.AndroidWidget = { updateStats }

    renderHook(() => useAndroidWidgetSync())

    await waitFor(() => expect(updateStats).toHaveBeenCalled())
    const stats = JSON.parse(updateStats.mock.calls[0][0])
    expect(stats).toMatchObject({ hasActiveTrip: false, findingsCount: 0, speciesCount: 0 })
  })

  it('wysyła statystyki aktywnej wyprawy wraz ze znaleziskami', async () => {
    const tripId = await db.trips.add({ name: 'Test', startedAt: Date.now(), endedAt: null, notes: '' })
    await db.findings.add({
      speciesId: 'borowik-szlachetny',
      speciesNameGuess: 'Borowik szlachetny',
      latitude: null,
      longitude: null,
      notes: '',
      createdAt: Date.now(),
      tripId,
    })
    useAppStore.setState({ activeTripId: tripId })

    const updateStats = vi.fn()
    window.AndroidWidget = { updateStats }

    renderHook(() => useAndroidWidgetSync())

    await waitFor(() => {
      const last = updateStats.mock.calls.at(-1)?.[0]
      expect(last && JSON.parse(last)).toMatchObject({
        hasActiveTrip: true,
        tripName: 'Test',
        findingsCount: 1,
        speciesCount: 1,
      })
    })
  })
})
