import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MapStatusBadges } from './MapStatusBadges'

const baseProps = {
  activeTripName: null,
  sunsetCountdown: null,
  mushroomOutlook: null,
  returnPoint: null,
  returnPointInfo: null,
  onClearReturnPoint: vi.fn(),
  navigationTargetSpot: null,
  navigationInfo: null,
  onClearNavigationTarget: vi.fn(),
}

describe('MapStatusBadges', () => {
  afterEach(() => cleanup())

  it('nie pokazuje żadnej plakietki, gdy wszystko jest puste', () => {
    render(<MapStatusBadges {...baseProps} />)
    expect(screen.queryByText(/./)).not.toBeInTheDocument()
  })

  it('pokazuje plakietkę aktywnej wyprawy', () => {
    render(<MapStatusBadges {...baseProps} activeTripName="Las pod Niebuszewem" />)
    expect(screen.getByText(/Aktywna wyprawa: Las pod Niebuszewem/)).toBeInTheDocument()
  })

  it('pokazuje odliczanie do zmroku, w tym wariant pilny', () => {
    render(
      <MapStatusBadges
        {...baseProps}
        sunsetCountdown={{ label: '32 min', isUrgent: true }}
      />,
    )
    expect(screen.getByText(/Zmrok za 32 min/)).toBeInTheDocument()
  })

  it('pokazuje prognozę grzybową', () => {
    render(
      <MapStatusBadges
        {...baseProps}
        mushroomOutlook={{ recentRainMm: 5, avgTempC: 14, score: 'dobry', label: 'Dobre warunki' }}
      />,
    )
    expect(screen.getByText('Dobre warunki')).toBeInTheDocument()
  })

  it('pokazuje zapisaną pozycję auta bez dystansu, gdy brak returnPointInfo', () => {
    render(
      <MapStatusBadges
        {...baseProps}
        returnPoint={{ latitude: 1, longitude: 2, savedAt: Date.now() }}
      />,
    )
    expect(screen.getByText('Auto zapisane')).toBeInTheDocument()
  })

  it('pokazuje dystans i kierunek do auta, gdy returnPointInfo jest dostępne', () => {
    render(
      <MapStatusBadges
        {...baseProps}
        returnPoint={{ latitude: 1, longitude: 2, savedAt: Date.now() }}
        returnPointInfo={{ distanceMeters: 250, bearingDegrees: 0 }}
      />,
    )
    expect(screen.getByText(/Auto: .*250 m.*N/)).toBeInTheDocument()
  })

  it('wywołuje onClearReturnPoint po kliknięciu przycisku usuwania', () => {
    const onClearReturnPoint = vi.fn()
    render(
      <MapStatusBadges
        {...baseProps}
        returnPoint={{ latitude: 1, longitude: 2, savedAt: Date.now() }}
        onClearReturnPoint={onClearReturnPoint}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Usuń zapisaną pozycję auta' }))
    expect(onClearReturnPoint).toHaveBeenCalledOnce()
  })

  it('pokazuje nazwę celu nawigacji bez dystansu, gdy brak navigationInfo', () => {
    render(
      <MapStatusBadges
        {...baseProps}
        navigationTargetSpot={{ id: 1, name: 'Sosnowy zagajnik', latitude: 1, longitude: 2, notes: '', createdAt: 1 }}
      />,
    )
    expect(screen.getByText('Sosnowy zagajnik')).toBeInTheDocument()
  })

  it('pokazuje dystans i kierunek do celu nawigacji, gdy navigationInfo jest dostępne', () => {
    render(
      <MapStatusBadges
        {...baseProps}
        navigationTargetSpot={{ id: 1, name: 'Sosnowy zagajnik', latitude: 1, longitude: 2, notes: '', createdAt: 1 }}
        navigationInfo={{ distanceMeters: 500, bearingDegrees: 0 }}
      />,
    )
    expect(screen.getByText(/Sosnowy zagajnik: .*500 m.*N/)).toBeInTheDocument()
  })

  it('wywołuje onClearNavigationTarget po kliknięciu przycisku zakończenia nawigacji', () => {
    const onClearNavigationTarget = vi.fn()
    render(
      <MapStatusBadges
        {...baseProps}
        navigationTargetSpot={{ id: 1, name: 'Sosnowy zagajnik', latitude: 1, longitude: 2, notes: '', createdAt: 1 }}
        onClearNavigationTarget={onClearNavigationTarget}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Zakończ nawigację do grzybowiska' }))
    expect(onClearNavigationTarget).toHaveBeenCalledOnce()
  })

  it('zwija plakietki za przełącznikiem, gdy aktywne są 2 lub więcej naraz, i rozwija po kliknięciu', () => {
    render(
      <MapStatusBadges
        {...baseProps}
        activeTripName="Las pod Niebuszewem"
        sunsetCountdown={{ label: '32 min', isUrgent: false }}
      />,
    )

    expect(screen.queryByText(/Aktywna wyprawa/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Zmrok za/)).not.toBeInTheDocument()
    const toggle = screen.getByRole('button', { name: 'Pokaż 2 informacje o warunkach' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(toggle)

    expect(screen.getByText(/Aktywna wyprawa: Las pod Niebuszewem/)).toBeInTheDocument()
    expect(screen.getByText(/Zmrok za 32 min/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Zwiń informacje o warunkach' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
  })
})
