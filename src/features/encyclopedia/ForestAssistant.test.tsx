import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ForestAssistant } from './ForestAssistant'
import { db } from '../../db/db'
import { useAppStore } from '../../stores/appStore'
import * as geolocation from '../../utils/geolocation'
import * as mushroomWeather from '../../utils/mushroomWeather'
import * as forestStandSearch from '../../utils/forestStandSearch'

vi.mock('../../utils/geolocation', () => ({
  getCurrentPosition: vi.fn(),
}))
vi.mock('../../utils/forestStandSearch', async () => {
  const actual = await vi.importActual<typeof import('../../utils/forestStandSearch')>('../../utils/forestStandSearch')
  return { ...actual, searchMatchingStands: vi.fn() }
})
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

  it('"Gdzie szukać": szuka drzewostanów z drzewami gatunku i "Prowadź" zapisuje grzybowisko jako cel nawigacji', async () => {
    vi.mocked(geolocation.getCurrentPosition).mockResolvedValue({ latitude: 53.35, longitude: 14.65 } as GeolocationCoordinates)
    vi.mocked(mushroomWeather.fetchMushroomOutlook).mockRejectedValue(new Error('offline'))
    vi.mocked(forestStandSearch.searchMatchingStands).mockResolvedValue([
      { id: '10-12-2-08-300-b-00', treeCode: 'BK', treeName: 'Buk', age: 121, siteType: 'las świeży', latitude: 53.36, longitude: 14.66, distanceM: 850 },
    ])
    const onOpenChange = vi.fn()
    render(<ForestAssistant open onOpenChange={onOpenChange} />)

    fireEvent.change(screen.getByPlaceholderText(/Borowik szlachetny/), { target: { value: 'borowik szlach' } })
    fireEvent.click(screen.getByText('Borowik szlachetny'))
    fireEvent.click(await screen.findByRole('button', { name: /Szukaj drzewostanów w pobliżu/ }))

    expect(await screen.findByText('850 m · las świeży')).toBeInTheDocument()
    expect(vi.mocked(forestStandSearch.searchMatchingStands).mock.calls[0][2]).toEqual(['DB', 'BK', 'SW'])

    fireEvent.click(screen.getByRole('button', { name: /Prowadź/ }))

    await waitFor(() => expect(useAppStore.getState().navigationTargetSpotId).not.toBeNull())
    const spot = await db.spots.get(useAppStore.getState().navigationTargetSpotId!)
    expect(spot?.name).toBe('Buk 121 lat - Borowik szlachetny')
    expect(useAppStore.getState().activeTab).toBe('mapa')
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('"Gdzie szukać": gatunek bez drzew w atlasie dostaje wyjaśnienie zamiast przycisku', async () => {
    vi.mocked(geolocation.getCurrentPosition).mockRejectedValue(new Error('brak GPS'))
    render(<ForestAssistant open onOpenChange={vi.fn()} />)

    fireEvent.change(screen.getByPlaceholderText(/Borowik szlachetny/), { target: { value: 'czubajka' } })
    fireEvent.click(screen.getByText('Czubajka kania'))

    expect(await screen.findByText(/nie wiąże tego gatunku z konkretnymi drzewami/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Szukaj drzewostanów/ })).not.toBeInTheDocument()
  })
})

