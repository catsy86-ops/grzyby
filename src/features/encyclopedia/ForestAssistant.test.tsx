import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ForestAssistant } from './ForestAssistant'
import { db } from '../../db/db'
import { useAppStore } from '../../stores/appStore'
import * as geolocation from '../../utils/geolocation'
import * as mushroomWeather from '../../utils/mushroomWeather'

vi.mock('../../utils/geolocation', () => ({
  getCurrentPosition: vi.fn(),
}))
vi.mock('../../utils/mushroomWeather', async () => {
  const actual = await vi.importActual<typeof import('../../utils/mushroomWeather')>('../../utils/mushroomWeather')
  return {
    ...actual,
    fetchMushroomOutlook: vi.fn(),
    fetchMushroomForecast: vi.fn(),
  }
})

describe('ForestAssistant', () => {
  beforeEach(async () => {
    await db.transaction('rw', db.spots, db.findings, async () => {
      await db.spots.clear()
      await db.findings.clear()
    })
    vi.mocked(geolocation.getCurrentPosition).mockReset()
    vi.mocked(mushroomWeather.fetchMushroomOutlook).mockReset()
    vi.mocked(mushroomWeather.fetchMushroomForecast).mockReset().mockResolvedValue([])
    useAppStore.setState({ navigationTargetSpotId: null, activeTab: 'baza-wiedzy' })
  })

  afterEach(() => cleanup())

  it('pokazuje wyniki wyszukiwania gatunku po nazwie', () => {
    render(<ForestAssistant open onOpenChange={vi.fn()} />)

    fireEvent.change(screen.getByPlaceholderText(/Borowik szlachetny/), { target: { value: 'borowik szlach' } })

    expect(screen.getByText('Borowik szlachetny')).toBeInTheDocument()
  })

  it('po wybraniu gatunku pokazuje sezon, siedlisko i pomija sekcję pogody, gdy brak GPS', async () => {
    vi.mocked(geolocation.getCurrentPosition).mockRejectedValue(new Error('brak GPS'))
    render(<ForestAssistant open onOpenChange={vi.fn()} />)

    fireEvent.change(screen.getByPlaceholderText(/Borowik szlachetny/), { target: { value: 'borowik szlach' } })
    fireEvent.click(screen.getByText('Borowik szlachetny'))

    expect(await screen.findByText(/Lasy liściaste i iglaste/)).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByText('Sprawdzanie pogody...')).not.toBeInTheDocument())
    expect(screen.queryByText(/Dobry czas na grzyby|Umiarkowane warunki|Słabe warunki/)).not.toBeInTheDocument()
  })

  it('pokazuje wynik prognozy pogodowej, gdy pozycja GPS jest dostępna', async () => {
    vi.mocked(geolocation.getCurrentPosition).mockResolvedValue({ latitude: 53.4, longitude: 14.5 })
    vi.mocked(mushroomWeather.fetchMushroomOutlook).mockResolvedValue({
      recentRainMm: 20,
      avgTempC: 15,
      score: 'dobry',
      label: 'Dobry czas na grzyby',
      soilMoisturePercent: null,
    })
    render(<ForestAssistant open onOpenChange={vi.fn()} />)

    fireEvent.change(screen.getByPlaceholderText(/Borowik szlachetny/), { target: { value: 'borowik szlach' } })
    fireEvent.click(screen.getByText('Borowik szlachetny'))

    expect(await screen.findByText('Dobry czas na grzyby')).toBeInTheDocument()
  })

  it('pokazuje własne sprawdzone miejsca dla wybranego gatunku i pozwala nawigować', async () => {
    vi.mocked(geolocation.getCurrentPosition).mockRejectedValue(new Error('brak GPS'))
    const spotId = await db.spots.add({
      name: 'Sosnowy zagajnik',
      latitude: 53.4,
      longitude: 14.5,
      notes: '',
      createdAt: 1,
    })
    await db.findings.add({
      speciesId: 'borowik-szlachetny',
      speciesNameGuess: null,
      latitude: 53.4,
      longitude: 14.5,
      notes: '',
      createdAt: 1000,
      spotId,
    })

    const onOpenChange = vi.fn()
    render(<ForestAssistant open onOpenChange={onOpenChange} />)

    fireEvent.change(screen.getByPlaceholderText(/Borowik szlachetny/), { target: { value: 'borowik szlach' } })
    fireEvent.click(screen.getByText('Borowik szlachetny'))

    expect(await screen.findByText('Sosnowy zagajnik')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Nawiguj' }))

    expect(useAppStore.getState().navigationTargetSpotId).toBe(spotId)
    expect(useAppStore.getState().activeTab).toBe('mapa')
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('pokazuje komunikat, gdy gatunek nigdy nie był znaleziony w zapisanym grzybowisku', async () => {
    vi.mocked(geolocation.getCurrentPosition).mockRejectedValue(new Error('brak GPS'))
    render(<ForestAssistant open onOpenChange={vi.fn()} />)

    fireEvent.change(screen.getByPlaceholderText(/Borowik szlachetny/), { target: { value: 'borowik szlach' } })
    fireEvent.click(screen.getByText('Borowik szlachetny'))

    expect(await screen.findByText(/Jeszcze nigdy nie znaleziono/)).toBeInTheDocument()
  })

  it('"Inny gatunek" wraca do wyszukiwania', async () => {
    vi.mocked(geolocation.getCurrentPosition).mockRejectedValue(new Error('brak GPS'))
    render(<ForestAssistant open onOpenChange={vi.fn()} />)

    fireEvent.change(screen.getByPlaceholderText(/Borowik szlachetny/), { target: { value: 'borowik szlach' } })
    fireEvent.click(screen.getByText('Borowik szlachetny'))
    await screen.findByText(/Lasy liściaste i iglaste/)

    fireEvent.click(screen.getByRole('button', { name: /Inny gatunek/ }))

    expect(screen.getByPlaceholderText(/Borowik szlachetny/)).toBeInTheDocument()
    expect(screen.queryByText(/Lasy liściaste i iglaste/)).not.toBeInTheDocument()
  })
})
