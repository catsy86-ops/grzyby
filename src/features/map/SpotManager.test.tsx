import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../db/db'
import { SpotManager } from './SpotManager'
import * as geolocation from '../../utils/geolocation'

vi.mock('../../utils/geolocation', () => ({
  getCurrentPosition: vi.fn(),
}))

describe('SpotManager', () => {
  beforeEach(async () => {
    await db.transaction('rw', db.spots, db.findings, async () => {
      await db.spots.clear()
      await db.findings.clear()
    })
    vi.mocked(geolocation.getCurrentPosition).mockReset()
  })

  afterEach(() => cleanup())

  it('zapisuje nowe grzybowisko na wybranej pinezce', async () => {
    render(
      <SpotManager
        open
        onOpenChange={vi.fn()}
        pinPosition={[52.1, 19.5]}
        navigationTargetSpotId={null}
        onSetNavigationTargetSpotId={vi.fn()}
      />,
    )

    fireEvent.change(screen.getByPlaceholderText(/Nazwa grzybowiska/), {
      target: { value: 'Sosnowy zagajnik' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz grzybowisko' }))

    await waitFor(async () => expect(await db.spots.count()).toBe(1))
    const spot = (await db.spots.toArray())[0]
    expect(spot.name).toBe('Sosnowy zagajnik')
    expect(spot.latitude).toBe(52.1)
    expect(spot.longitude).toBe(19.5)
  })

  it('używa pozycji GPS, gdy brak wybranej pinezki', async () => {
    vi.mocked(geolocation.getCurrentPosition).mockResolvedValue({ latitude: 50.0, longitude: 20.0 })
    render(
      <SpotManager
        open
        onOpenChange={vi.fn()}
        pinPosition={null}
        navigationTargetSpotId={null}
        onSetNavigationTargetSpotId={vi.fn()}
      />,
    )

    fireEvent.change(screen.getByPlaceholderText(/Nazwa grzybowiska/), { target: { value: 'GPS spot' } })
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz grzybowisko' }))

    await waitFor(async () => expect(await db.spots.count()).toBe(1))
    const spot = (await db.spots.toArray())[0]
    expect(spot.latitude).toBe(50.0)
    expect(spot.longitude).toBe(20.0)
  })

  it('pokazuje statystyki znalezisk przypisanych do grzybowiska', async () => {
    const spotId = await db.spots.add({ name: 'Test spot', latitude: 1, longitude: 1, notes: '', createdAt: 1 })
    await db.findings.add({
      speciesId: 'borowik-szlachetny',
      speciesNameGuess: 'Borowik szlachetny',
      latitude: 1,
      longitude: 1,
      notes: '',
      createdAt: 500,
      spotId,
    })

    render(
      <SpotManager
        open
        onOpenChange={vi.fn()}
        pinPosition={null}
        navigationTargetSpotId={null}
        onSetNavigationTargetSpotId={vi.fn()}
      />,
    )

    expect(await screen.findByText(/1 znalezisko/)).toBeInTheDocument()
    expect(screen.getByText(/1 gatunków/)).toBeInTheDocument()
  })

  it('usuwa grzybowisko i odpina znaleziska bez ich kasowania', async () => {
    const spotId = await db.spots.add({ name: 'Do usunięcia', latitude: 1, longitude: 1, notes: '', createdAt: 1 })
    const findingId = await db.findings.add({
      speciesId: null,
      speciesNameGuess: null,
      latitude: 1,
      longitude: 1,
      notes: '',
      createdAt: 1,
      spotId,
    })

    render(
      <SpotManager
        open
        onOpenChange={vi.fn()}
        pinPosition={null}
        navigationTargetSpotId={null}
        onSetNavigationTargetSpotId={vi.fn()}
      />,
    )

    fireEvent.click(await screen.findByRole('button', { name: /Usuń grzybowisko/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Usuń' }))

    await waitFor(async () => expect(await db.spots.count()).toBe(0))
    const finding = await db.findings.get(findingId)
    expect(finding).toBeDefined()
    expect(finding?.spotId).toBeUndefined()
  })

  it('przełącza grzybowisko jako cel nawigacji i odznacza go po ponownym kliknięciu', async () => {
    const spotId = await db.spots.add({ name: 'Cel', latitude: 1, longitude: 1, notes: '', createdAt: 1 })
    const onSetNavigationTargetSpotId = vi.fn()

    render(
      <SpotManager
        open
        onOpenChange={vi.fn()}
        pinPosition={null}
        navigationTargetSpotId={null}
        onSetNavigationTargetSpotId={onSetNavigationTargetSpotId}
      />,
    )

    fireEvent.click(await screen.findByRole('button', { name: 'Nawiguj do: Cel' }))
    expect(onSetNavigationTargetSpotId).toHaveBeenCalledWith(spotId)

    cleanup()
    render(
      <SpotManager
        open
        onOpenChange={vi.fn()}
        pinPosition={null}
        navigationTargetSpotId={spotId}
        onSetNavigationTargetSpotId={onSetNavigationTargetSpotId}
      />,
    )

    fireEvent.click(await screen.findByRole('button', { name: 'Zakończ nawigację do: Cel' }))
    expect(onSetNavigationTargetSpotId).toHaveBeenCalledWith(null)
  })

  it('pokazuje pustą listę, gdy nie ma zapisanych grzybowisk', async () => {
    render(
      <SpotManager
        open
        onOpenChange={vi.fn()}
        pinPosition={null}
        navigationTargetSpotId={null}
        onSetNavigationTargetSpotId={vi.fn()}
      />,
    )

    expect(await screen.findByText('Brak zapisanych grzybowisk.')).toBeInTheDocument()
  })
})
