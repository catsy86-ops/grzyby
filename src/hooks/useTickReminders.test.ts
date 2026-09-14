import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../db/db'
import { useAppStore } from '../stores/appStore'
import * as notifications from '../utils/notifications'
import { useTickReminders } from './useTickReminders'

beforeEach(async () => {
  await db.trips.clear()
  useAppStore.setState({ activeTripId: null })
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('useTickReminders', () => {
  it('wysyła przypomnienie o spryskaniu, gdy aktywna wyprawa trwa dłużej niż interwał', async () => {
    const notifySpy = vi.spyOn(notifications, 'showLocalNotification').mockResolvedValue()
    const tripId = await db.trips.add({
      name: 'Test',
      startedAt: Date.now() - 4 * 60 * 60_000,
      endedAt: null,
      notes: '',
    })
    useAppStore.setState({ activeTripId: tripId })

    renderHook(() => useTickReminders())

    await waitFor(() =>
      expect(notifySpy).toHaveBeenCalledWith('Przypomnienie o kleszczach', expect.anything())
    )
  })

  it('nie wysyła przypomnienia o spryskaniu, gdy wyprawa trwa krótko', async () => {
    const notifySpy = vi.spyOn(notifications, 'showLocalNotification').mockResolvedValue()
    const tripId = await db.trips.add({ name: 'Test', startedAt: Date.now(), endedAt: null, notes: '' })
    useAppStore.setState({ activeTripId: tripId })

    renderHook(() => useTickReminders())

    await new Promise((r) => setTimeout(r, 10))
    expect(notifySpy).not.toHaveBeenCalledWith('Przypomnienie o kleszczach', expect.anything())
  })

  it('wysyła przypomnienie o kontroli skóry 14 dni po zakończonej wyprawie', async () => {
    const notifySpy = vi.spyOn(notifications, 'showLocalNotification').mockResolvedValue()
    await db.trips.add({
      name: 'Stara wyprawa',
      startedAt: Date.now() - 15 * 24 * 60 * 60_000,
      endedAt: Date.now() - 15 * 24 * 60 * 60_000,
      notes: '',
    })

    renderHook(() => useTickReminders())

    await waitFor(() => expect(notifySpy).toHaveBeenCalledWith('Kontrola po kleszczach', expect.anything()))
  })

  it('nie przypomina ponownie o tej samej wyprawie po odmontowaniu i ponownym montowaniu', async () => {
    const notifySpy = vi.spyOn(notifications, 'showLocalNotification').mockResolvedValue()
    await db.trips.add({
      name: 'Stara wyprawa',
      startedAt: Date.now() - 15 * 24 * 60 * 60_000,
      endedAt: Date.now() - 15 * 24 * 60 * 60_000,
      notes: '',
    })

    const { unmount } = renderHook(() => useTickReminders())
    await waitFor(() => expect(notifySpy).toHaveBeenCalledTimes(1))
    unmount()

    renderHook(() => useTickReminders())
    await new Promise((r) => setTimeout(r, 10))
    expect(notifySpy).toHaveBeenCalledTimes(1)
  })
})
