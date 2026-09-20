import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../db/db'
import { useAppStore } from '../stores/appStore'
import * as geolocation from '../utils/geolocation'
import * as notifications from '../utils/notifications'
import * as stormRisk from '../utils/stormRisk'
import { useStormWarning } from './useStormWarning'

function setOnline(value: boolean) {
  Object.defineProperty(navigator, 'onLine', { value, configurable: true })
}

beforeEach(async () => {
  await db.trips.clear()
  localStorage.clear()
  useAppStore.setState({ activeTripId: null })
  vi.restoreAllMocks()
  setOnline(true)
})

describe('useStormWarning', () => {
  it('wysyła ostrzeżenie, gdy prognoza wskazuje ryzyko burzy/silnego wiatru', async () => {
    vi.spyOn(geolocation, 'getCurrentPosition').mockResolvedValue({ latitude: 53.4, longitude: 14.5 })
    vi.spyOn(stormRisk, 'fetchStormForecast').mockResolvedValue({
      weatherCode: 95,
      windSpeedMaxKmh: 10,
      isStormRisk: true,
    })
    const notifySpy = vi.spyOn(notifications, 'showLocalNotification').mockResolvedValue()
    const tripId = await db.trips.add({ name: 'Wyprawa testowa', startedAt: Date.now(), endedAt: null, notes: '' })
    useAppStore.setState({ activeTripId: tripId })

    renderHook(() => useStormWarning())

    await waitFor(() => expect(notifySpy).toHaveBeenCalledWith('Ostrzeżenie pogodowe', expect.anything()))
  })

  it('nie ostrzega, gdy prognoza nie wskazuje ryzyka', async () => {
    vi.spyOn(geolocation, 'getCurrentPosition').mockResolvedValue({ latitude: 53.4, longitude: 14.5 })
    vi.spyOn(stormRisk, 'fetchStormForecast').mockResolvedValue({
      weatherCode: 1,
      windSpeedMaxKmh: 10,
      isStormRisk: false,
    })
    const notifySpy = vi.spyOn(notifications, 'showLocalNotification').mockResolvedValue()
    const tripId = await db.trips.add({ name: 'Wyprawa testowa', startedAt: Date.now(), endedAt: null, notes: '' })
    useAppStore.setState({ activeTripId: tripId })

    renderHook(() => useStormWarning())

    await new Promise((r) => setTimeout(r, 10))
    expect(notifySpy).not.toHaveBeenCalled()
  })

  it('nie sprawdza pogody, gdy aplikacja jest offline', async () => {
    setOnline(false)
    const positionSpy = vi.spyOn(geolocation, 'getCurrentPosition')
    const tripId = await db.trips.add({ name: 'Wyprawa testowa', startedAt: Date.now(), endedAt: null, notes: '' })
    useAppStore.setState({ activeTripId: tripId })

    renderHook(() => useStormWarning())

    await new Promise((r) => setTimeout(r, 10))
    expect(positionSpy).not.toHaveBeenCalled()
  })

  it('nie rzuca błędu i nie ostrzega, gdy brak GPS', async () => {
    vi.spyOn(geolocation, 'getCurrentPosition').mockRejectedValue(new Error('brak GPS'))
    const notifySpy = vi.spyOn(notifications, 'showLocalNotification').mockResolvedValue()
    const tripId = await db.trips.add({ name: 'Wyprawa testowa', startedAt: Date.now(), endedAt: null, notes: '' })
    useAppStore.setState({ activeTripId: tripId })

    renderHook(() => useStormWarning())

    await new Promise((r) => setTimeout(r, 10))
    expect(notifySpy).not.toHaveBeenCalled()
  })

  it('nie ostrzega ponownie po odmontowaniu i ponownym montowaniu dla tej samej wyprawy', async () => {
    vi.spyOn(geolocation, 'getCurrentPosition').mockResolvedValue({ latitude: 53.4, longitude: 14.5 })
    vi.spyOn(stormRisk, 'fetchStormForecast').mockResolvedValue({
      weatherCode: 95,
      windSpeedMaxKmh: 10,
      isStormRisk: true,
    })
    const notifySpy = vi.spyOn(notifications, 'showLocalNotification').mockResolvedValue()
    const tripId = await db.trips.add({ name: 'Wyprawa testowa', startedAt: Date.now(), endedAt: null, notes: '' })
    useAppStore.setState({ activeTripId: tripId })

    const { unmount } = renderHook(() => useStormWarning())
    await waitFor(() => expect(notifySpy).toHaveBeenCalledTimes(1))
    unmount()

    renderHook(() => useStormWarning())
    await new Promise((r) => setTimeout(r, 10))
    expect(notifySpy).toHaveBeenCalledTimes(1)
  })

  it('nic nie robi, gdy nie ma aktywnej wyprawy', async () => {
    const positionSpy = vi.spyOn(geolocation, 'getCurrentPosition')

    renderHook(() => useStormWarning())

    await new Promise((r) => setTimeout(r, 10))
    expect(positionSpy).not.toHaveBeenCalled()
  })
})
