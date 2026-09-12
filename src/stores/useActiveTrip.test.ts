import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/db'
import { reconcileActiveTripId, useAppStore } from './appStore'
import { useActiveTrip } from './useActiveTrip'

beforeEach(async () => {
  await db.trips.clear()
  useAppStore.setState({ activeTripId: null })
})

describe('useActiveTrip', () => {
  it('zwraca aktywną wyprawę, gdy activeTripId wskazuje na trwającą wyprawę', async () => {
    const tripId = await db.trips.add({ name: 'Test', startedAt: Date.now(), endedAt: null, notes: '' })
    useAppStore.setState({ activeTripId: tripId })

    const { result } = renderHook(() => useActiveTrip())

    await waitFor(() => expect(result.current.activeTrip?.id).toBe(tripId))
    expect(useAppStore.getState().activeTripId).toBe(tripId)
  })
})

describe('reconcileActiveTripId', () => {
  it('nie zmienia stanu, gdy activeTripId wskazuje na trwającą wyprawę', async () => {
    const tripId = await db.trips.add({ name: 'Test', startedAt: Date.now(), endedAt: null, notes: '' })
    useAppStore.setState({ activeTripId: tripId })

    await reconcileActiveTripId()

    expect(useAppStore.getState().activeTripId).toBe(tripId)
  })

  it('czyści activeTripId, gdy wskazywana wyprawa została w międzyczasie zakończona', async () => {
    const tripId = await db.trips.add({
      name: 'Zakończona',
      startedAt: Date.now(),
      endedAt: Date.now(),
      notes: '',
    })
    useAppStore.setState({ activeTripId: tripId })

    await reconcileActiveTripId()

    expect(useAppStore.getState().activeTripId).toBeNull()
  })

  it('czyści activeTripId, gdy wskazywana wyprawa nie istnieje w bazie (utrwalony, nieaktualny stan)', async () => {
    useAppStore.setState({ activeTripId: 999999 })

    await reconcileActiveTripId()

    expect(useAppStore.getState().activeTripId).toBeNull()
  })

  it('nic nie robi, gdy nie ma aktywnej wyprawy', async () => {
    useAppStore.setState({ activeTripId: null })

    await reconcileActiveTripId()

    expect(useAppStore.getState().activeTripId).toBeNull()
  })
})
