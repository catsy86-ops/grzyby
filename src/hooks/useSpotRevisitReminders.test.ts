import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../db/db'
import * as notifications from '../utils/notifications'
import { useSpotRevisitReminders } from './useSpotRevisitReminders'

const currentMonth = new Date().getMonth() + 1
const otherMonth = currentMonth === 1 ? 2 : 1

beforeEach(async () => {
  await db.spots.clear()
  localStorage.clear()
  vi.restoreAllMocks()
  // Przypomnienia zapisują znacznik "już powiadomiono" dopiero po sprawdzeniu zgody na
  // powiadomienia (patrz canShowNotifications) - w jsdom nie ma jej domyślnie, więc bez tego
  // stuba żaden z poniższych testów nie doszedłby do wysyłki.
  vi.spyOn(notifications, 'canShowNotifications').mockReturnValue(true)
})

describe('useSpotRevisitReminders', () => {
  it('wysyła przypomnienie, gdy bieżący miesiąc zgadza się z flagą i minęło ~rok od oflagowania', async () => {
    const notifySpy = vi.spyOn(notifications, 'showLocalNotification').mockResolvedValue(true)
    await db.spots.add({
      name: 'Sosnowy zagajnik',
      latitude: 1,
      longitude: 2,
      notes: '',
      createdAt: Date.now(),
      revisitMonth: currentMonth,
      revisitFlaggedAt: Date.now() - 320 * 24 * 60 * 60_000,
    })

    renderHook(() => useSpotRevisitReminders())

    await waitFor(() =>
      expect(notifySpy).toHaveBeenCalledWith('Czas sprawdzić grzybowisko', expect.anything()),
    )
  })

  it('nie wysyła przypomnienia, gdy oflagowany miesiąc nie zgadza się z bieżącym', async () => {
    const notifySpy = vi.spyOn(notifications, 'showLocalNotification').mockResolvedValue(true)
    await db.spots.add({
      name: 'Sosnowy zagajnik',
      latitude: 1,
      longitude: 2,
      notes: '',
      createdAt: Date.now(),
      revisitMonth: otherMonth,
      revisitFlaggedAt: Date.now() - 320 * 24 * 60 * 60_000,
    })

    renderHook(() => useSpotRevisitReminders())

    await new Promise((r) => setTimeout(r, 10))
    expect(notifySpy).not.toHaveBeenCalled()
  })

  it('nie wysyła przypomnienia, gdy oflagowano w tym samym sezonie (za wcześnie)', async () => {
    const notifySpy = vi.spyOn(notifications, 'showLocalNotification').mockResolvedValue(true)
    await db.spots.add({
      name: 'Sosnowy zagajnik',
      latitude: 1,
      longitude: 2,
      notes: '',
      createdAt: Date.now(),
      revisitMonth: currentMonth,
      revisitFlaggedAt: Date.now(),
    })

    renderHook(() => useSpotRevisitReminders())

    await new Promise((r) => setTimeout(r, 10))
    expect(notifySpy).not.toHaveBeenCalled()
  })

  it('nie przypomina ponownie po odmontowaniu i ponownym montowaniu w tym samym roku', async () => {
    const notifySpy = vi.spyOn(notifications, 'showLocalNotification').mockResolvedValue(true)
    await db.spots.add({
      name: 'Sosnowy zagajnik',
      latitude: 1,
      longitude: 2,
      notes: '',
      createdAt: Date.now(),
      revisitMonth: currentMonth,
      revisitFlaggedAt: Date.now() - 320 * 24 * 60 * 60_000,
    })

    const { unmount } = renderHook(() => useSpotRevisitReminders())
    await waitFor(() => expect(notifySpy).toHaveBeenCalledTimes(1))
    unmount()

    renderHook(() => useSpotRevisitReminders())
    await new Promise((r) => setTimeout(r, 10))
    expect(notifySpy).toHaveBeenCalledTimes(1)
  })
})
