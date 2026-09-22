import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../db/db'
import { useAppStore } from '../../stores/appStore'
import * as geolocation from '../../utils/geolocation'
import * as notifications from '../../utils/notifications'
import * as rainCheck from '../../utils/rainCheck'
import { TripManager } from './TripManager'

const LONG_TRIP_NOTIFIED_KEY = 'lysy-long-trip-notified-id'

beforeEach(async () => {
  await db.trips.clear()
  useAppStore.setState({ activeTripId: null })
  localStorage.removeItem(LONG_TRIP_NOTIFIED_KEY)
  vi.restoreAllMocks()
})

afterEach(() => cleanup())

describe('TripManager', () => {
  it('pokazuje przycisk startu, gdy nie ma aktywnej wyprawy', () => {
    render(<TripManager />)
    expect(screen.getByRole('button', { name: /Rozpocznij wyprawę/ })).toBeInTheDocument()
  })

  it('startuje nową wyprawę i pokazuje widok aktywnej wyprawy', async () => {
    render(<TripManager />)

    fireEvent.click(screen.getByRole('button', { name: /Rozpocznij wyprawę/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Start' }))

    await waitFor(() => expect(screen.getByText(/Aktywna wyprawa/)).toBeInTheDocument())
    expect(await db.trips.count()).toBe(1)
  })

  it('kończy wyprawę i zapisuje wasRainy na podstawie jednorazowego odczytu pogody', async () => {
    vi.spyOn(geolocation, 'getCurrentPosition').mockResolvedValue({ latitude: 53.4, longitude: 14.5 })
    vi.spyOn(rainCheck, 'fetchIsCurrentlyRaining').mockResolvedValue(true)
    const tripId = await db.trips.add({ name: 'Wyprawa testowa', startedAt: Date.now(), endedAt: null, notes: '' })
    useAppStore.setState({ activeTripId: tripId })

    render(<TripManager />)
    fireEvent.click(await screen.findByRole('button', { name: 'Zakończ wyprawę' }))

    await waitFor(async () => expect((await db.trips.get(tripId))?.wasRainy).toBe(true))
    const trip = await db.trips.get(tripId)
    expect(trip?.endedAt).not.toBeNull()
    expect(useAppStore.getState().activeTripId).toBeNull()
  })

  it('kończy wyprawę mimo błędu odczytu pogody (best-effort, bez blokowania zakończenia)', async () => {
    vi.spyOn(geolocation, 'getCurrentPosition').mockRejectedValue(new Error('brak GPS'))
    const tripId = await db.trips.add({ name: 'Wyprawa testowa', startedAt: Date.now(), endedAt: null, notes: '' })
    useAppStore.setState({ activeTripId: tripId })

    render(<TripManager />)
    fireEvent.click(await screen.findByRole('button', { name: 'Zakończ wyprawę' }))

    await waitFor(async () => expect((await db.trips.get(tripId))?.endedAt).not.toBeNull())
    expect((await db.trips.get(tripId))?.wasRainy).toBeUndefined()
    expect(useAppStore.getState().activeTripId).toBeNull()
  })

  it('pokazuje liczbę dni od ostatniej wyprawy, gdy nie ma aktywnej', async () => {
    const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000
    await db.trips.add({ name: 'Stara wyprawa', startedAt: threeDaysAgo, endedAt: threeDaysAgo + 1000, notes: '' })

    render(<TripManager />)

    expect(await screen.findByText('3 dni od ostatniej wyprawy')).toBeInTheDocument()
  })

  it('nie pokazuje licznika dni, gdy brak jakiejkolwiek wyprawy w historii', async () => {
    render(<TripManager />)

    await waitFor(() => {
      expect(screen.queryByText(/od ostatniej wyprawy/)).not.toBeInTheDocument()
    })
  })

  it('pokazuje ostrzeżenie o przeciągającej się wyprawie, gdy minął planowany czas powrotu', async () => {
    const tripId = await db.trips.add({
      name: 'Wyprawa testowa',
      startedAt: Date.now() - 60_000,
      endedAt: null,
      notes: '',
      plannedReturnAt: Date.now() - 1000,
    })
    useAppStore.setState({ activeTripId: tripId })

    render(<TripManager />)

    expect(await screen.findByText(/Wyprawa się przeciąga/)).toBeInTheDocument()
  })

  it('wysyła SMS z lokalizacją po kliknięciu przycisku w ostrzeżeniu o przeciągającej się wyprawie', async () => {
    vi.spyOn(geolocation, 'getCurrentPosition').mockResolvedValue({ latitude: 53.4, longitude: 14.5 })
    const originalHref = window.location.href
    const hrefSetter = vi.fn()
    Object.defineProperty(window, 'location', {
      value: { ...window.location, set href(v: string) { hrefSetter(v) } },
      writable: true,
    })

    const tripId = await db.trips.add({
      name: 'Wyprawa testowa',
      startedAt: Date.now() - 60_000,
      endedAt: null,
      notes: '',
      plannedReturnAt: Date.now() - 1000,
    })
    useAppStore.setState({ activeTripId: tripId })

    render(<TripManager />)
    fireEvent.click(await screen.findByRole('button', { name: 'Wyślij SMS z lokalizacją' }))

    await waitFor(() => expect(hrefSetter).toHaveBeenCalled())
    expect(hrefSetter.mock.calls[0][0]).toContain('sms:')

    Object.defineProperty(window, 'location', { value: { ...window.location, href: originalHref }, writable: true })
  })

  it('pokazuje błąd, gdy nie udało się ustalić lokalizacji do SMS-a', async () => {
    vi.spyOn(geolocation, 'getCurrentPosition').mockRejectedValue(new Error('brak GPS'))

    const tripId = await db.trips.add({
      name: 'Wyprawa testowa',
      startedAt: Date.now() - 60_000,
      endedAt: null,
      notes: '',
      plannedReturnAt: Date.now() - 1000,
    })
    useAppStore.setState({ activeTripId: tripId })

    render(<TripManager />)
    fireEvent.click(await screen.findByRole('button', { name: 'Wyślij SMS z lokalizacją' }))

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Wyślij SMS z lokalizacją' })).not.toBeDisabled(),
    )
  })

  it('powiadamia raz o długiej wyprawie i nie duplikuje powiadomienia przy ponownym sprawdzeniu (np. kolejny tick)', async () => {
    const notifySpy = vi.spyOn(notifications, 'showLocalNotification').mockResolvedValue()

    const longAgo = Date.now() - 5 * 60 * 60 * 1000
    const tripId = await db.trips.add({ name: 'Długa wyprawa', startedAt: longAgo, endedAt: null, notes: '' })
    useAppStore.setState({ activeTripId: tripId })

    const { unmount } = render(<TripManager />)

    await waitFor(() => expect(notifySpy).toHaveBeenCalledTimes(1))
    expect(localStorage.getItem(LONG_TRIP_NOTIFIED_KEY)).toBe(String(tripId))
    unmount()

    // Zamontowanie ponownie (ten sam efekt co kolejny tick 60s-interwału) uruchamia checkLongTrip()
    // od nowa - dedupe po localStorage musi wciąż zapobiec drugiemu powiadomieniu.
    render(<TripManager />)
    await waitFor(() => expect(screen.getByText(/Aktywna wyprawa/)).toBeInTheDocument())
    expect(notifySpy).toHaveBeenCalledTimes(1)
  })
})
