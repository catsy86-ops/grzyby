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
  // Przypomnienia zapisują znacznik "już powiadomiono" dopiero po sprawdzeniu zgody na
  // powiadomienia (patrz canShowNotifications) - w jsdom nie ma jej domyślnie, więc bez tego
  // stuba żaden z poniższych testów nie doszedłby do wysyłki.
  vi.spyOn(notifications, 'canShowNotifications').mockReturnValue(true)
})

describe('useTickReminders', () => {
  it('wysyła przypomnienie o spryskaniu, gdy aktywna wyprawa trwa dłużej niż interwał', async () => {
    const notifySpy = vi.spyOn(notifications, 'showLocalNotification').mockResolvedValue(true)
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
    const notifySpy = vi.spyOn(notifications, 'showLocalNotification').mockResolvedValue(true)
    const tripId = await db.trips.add({ name: 'Test', startedAt: Date.now(), endedAt: null, notes: '' })
    useAppStore.setState({ activeTripId: tripId })

    renderHook(() => useTickReminders())

    await new Promise((r) => setTimeout(r, 10))
    expect(notifySpy).not.toHaveBeenCalledWith('Przypomnienie o kleszczach', expect.anything())
  })

  it('wysyła przypomnienie o kontroli skóry 14 dni po zakończonej wyprawie', async () => {
    const notifySpy = vi.spyOn(notifications, 'showLocalNotification').mockResolvedValue(true)
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
    const notifySpy = vi.spyOn(notifications, 'showLocalNotification').mockResolvedValue(true)
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

describe('useTickReminders - brak zgody na powiadomienia', () => {
  // Regresja: znacznik "już powiadomiono" był zapisywany PRZED wysyłką, a ta przy braku zgody
  // cicho wychodziła. Użytkownik, który nie dał zgody (albo nie był o nią jeszcze pytany, bo
  // banner z prośbą żyje tylko w Dzienniku), tracił kontrolę po kleszczach NA ZAWSZE - po
  // późniejszym włączeniu zgody znacznik już mówił "wysłane".
  it('nie zapisuje znacznika, gdy zgody nie ma - przypomnienie dochodzi po jej włączeniu', async () => {
    const canSpy = vi.spyOn(notifications, 'canShowNotifications').mockReturnValue(false)
    const notifySpy = vi.spyOn(notifications, 'showLocalNotification').mockResolvedValue(false)
    const tripId = await db.trips.add({
      name: 'Wyprawa sprzed dwóch tygodni',
      startedAt: Date.now() - 20 * 24 * 60 * 60_000,
      endedAt: Date.now() - 15 * 24 * 60 * 60_000,
      notes: '',
    })

    const first = renderHook(() => useTickReminders())
    // Czekamy na wywołanie strażnika, nie na wynik hooka (hook nic nie zwraca, więc `waitFor` na
    // `result.current` kończyłby się natychmiast, zanim efekt zdąży cokolwiek zrobić - i test
    // przechodziłby także BEZ poprawki, czyli nie pilnowałby niczego).
    await waitFor(() => expect(canSpy).toHaveBeenCalled())
    expect(notifySpy).not.toHaveBeenCalled()
    // Sedno testu: nic nie zostało "zużyte" w localStorage.
    expect(localStorage.getItem('lysy-tick-check-notified-trip-ids') ?? '').not.toContain(String(tripId))
    first.unmount()

    // Użytkownik włącza zgodę - to samo przypomnienie musi się teraz pojawić.
    vi.spyOn(notifications, 'canShowNotifications').mockReturnValue(true)
    renderHook(() => useTickReminders())

    await waitFor(() => expect(notifySpy).toHaveBeenCalledWith('Kontrola po kleszczach', expect.anything()))
  })
})
