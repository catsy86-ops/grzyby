import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../db/db'
import { useAppStore } from '../../stores/appStore'
import * as geolocation from '../../utils/geolocation'
import * as rainCheck from '../../utils/rainCheck'
import { TripManager } from './TripManager'

beforeEach(async () => {
  await db.trips.clear()
  useAppStore.setState({ activeTripId: null })
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
})
