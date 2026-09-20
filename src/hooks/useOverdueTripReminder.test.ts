import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../db/db'
import { useAppStore } from '../stores/appStore'
import * as notifications from '../utils/notifications'
import { useOverdueTripReminder } from './useOverdueTripReminder'

beforeEach(async () => {
  await db.trips.clear()
  localStorage.clear()
  useAppStore.setState({ activeTripId: null })
  vi.restoreAllMocks()
})

describe('useOverdueTripReminder', () => {
  it('wysyła przypomnienie, gdy minął planowany czas powrotu', async () => {
    const notifySpy = vi.spyOn(notifications, 'showLocalNotification').mockResolvedValue()
    const tripId = await db.trips.add({
      name: 'Wyprawa testowa',
      startedAt: Date.now() - 60_000,
      endedAt: null,
      notes: '',
      plannedReturnAt: Date.now() - 1000,
    })
    useAppStore.setState({ activeTripId: tripId })

    renderHook(() => useOverdueTripReminder())

    await waitFor(() => expect(notifySpy).toHaveBeenCalledWith('Wyprawa się przeciąga', expect.anything()))
  })

  it('nie wysyła przypomnienia, gdy nie podano planowanego powrotu', async () => {
    const notifySpy = vi.spyOn(notifications, 'showLocalNotification').mockResolvedValue()
    const tripId = await db.trips.add({
      name: 'Wyprawa testowa',
      startedAt: Date.now() - 60_000,
      endedAt: null,
      notes: '',
      plannedReturnAt: null,
    })
    useAppStore.setState({ activeTripId: tripId })

    renderHook(() => useOverdueTripReminder())

    await new Promise((r) => setTimeout(r, 10))
    expect(notifySpy).not.toHaveBeenCalled()
  })

  it('nie wysyła przypomnienia, gdy planowany powrót jeszcze nie minął', async () => {
    const notifySpy = vi.spyOn(notifications, 'showLocalNotification').mockResolvedValue()
    const tripId = await db.trips.add({
      name: 'Wyprawa testowa',
      startedAt: Date.now() - 60_000,
      endedAt: null,
      notes: '',
      plannedReturnAt: Date.now() + 60 * 60_000,
    })
    useAppStore.setState({ activeTripId: tripId })

    renderHook(() => useOverdueTripReminder())

    await new Promise((r) => setTimeout(r, 10))
    expect(notifySpy).not.toHaveBeenCalled()
  })

  it('nie przypomina ponownie po odmontowaniu i ponownym montowaniu dla tej samej wyprawy', async () => {
    const notifySpy = vi.spyOn(notifications, 'showLocalNotification').mockResolvedValue()
    const tripId = await db.trips.add({
      name: 'Wyprawa testowa',
      startedAt: Date.now() - 60_000,
      endedAt: null,
      notes: '',
      plannedReturnAt: Date.now() - 1000,
    })
    useAppStore.setState({ activeTripId: tripId })

    const { unmount } = renderHook(() => useOverdueTripReminder())
    await waitFor(() => expect(notifySpy).toHaveBeenCalledTimes(1))
    unmount()

    renderHook(() => useOverdueTripReminder())
    await new Promise((r) => setTimeout(r, 10))
    expect(notifySpy).toHaveBeenCalledTimes(1)
  })

  it('nic nie robi, gdy nie ma aktywnej wyprawy', async () => {
    const notifySpy = vi.spyOn(notifications, 'showLocalNotification').mockResolvedValue()

    renderHook(() => useOverdueTripReminder())

    await new Promise((r) => setTimeout(r, 10))
    expect(notifySpy).not.toHaveBeenCalled()
  })
})
