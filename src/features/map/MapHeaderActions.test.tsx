import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MapHeaderActions } from './MapHeaderActions'

const baseProps = {
  userPosition: null,
  hasReturnPoint: false,
  onLocate: vi.fn(),
  onOpenSheet: vi.fn(),
  onSaveReturnPoint: vi.fn(),
  mapLayerId: 'street' as const,
  onChangeMapLayer: vi.fn(),
  findingsCount: 0,
  isHeatmapView: false,
  onToggleHeatmapView: vi.fn(),
  isSeasonalOverlayEnabled: false,
  onToggleSeasonalOverlay: vi.fn(),
  seasonalOverlayDisabled: false,
  speciesOptions: [],
  speciesFilterIds: new Set<string>(),
  onToggleSpeciesFilter: vi.fn(),
  onClearSpeciesFilter: vi.fn(),
  powerSaveMode: 'auto' as const,
  onChangePowerSaveMode: vi.fn(),
  powerSaveActive: false,
}

describe('MapHeaderActions', () => {
  afterEach(() => cleanup())

  it('wywołuje onLocate po kliknięciu "Zlokalizuj mnie"', () => {
    const onLocate = vi.fn()
    render(<MapHeaderActions {...baseProps} onLocate={onLocate} />)

    fireEvent.click(screen.getByRole('button', { name: 'Zlokalizuj mnie' }))
    expect(onLocate).toHaveBeenCalledOnce()
  })

  it('wywołuje onOpenSheet("spots") po kliknięciu przycisku "Grzybowiska"', () => {
    const onOpenSheet = vi.fn()
    render(<MapHeaderActions {...baseProps} onOpenSheet={onOpenSheet} />)

    fireEvent.click(screen.getByRole('button', { name: 'Grzybowiska' }))
    expect(onOpenSheet).toHaveBeenCalledWith('spots')
  })

  it('menu narzędzi otwiera akcje offline/kompas/auto i pomija SMS bez znanej pozycji', () => {
    const onOpenSheet = vi.fn()
    render(<MapHeaderActions {...baseProps} onOpenSheet={onOpenSheet} userPosition={null} />)

    fireEvent.click(screen.getByRole('button', { name: 'Więcej narzędzi mapy' }))

    expect(screen.getByText('Pobierz obszar offline')).toBeInTheDocument()
    expect(screen.getByText('Kompas')).toBeInTheDocument()
    expect(screen.getByText('Zapisz pozycję auta')).toBeInTheDocument()
    expect(screen.queryByText('Wyślij SMS z lokalizacją')).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('Pobierz obszar offline'))
    expect(onOpenSheet).toHaveBeenCalledWith('offline-download')
  })

  it('menu narzędzi pokazuje "Zaktualizuj pozycję auta" i opcję SMS, gdy pozycja jest znana', () => {
    render(<MapHeaderActions {...baseProps} hasReturnPoint userPosition={[52, 21]} />)

    fireEvent.click(screen.getByRole('button', { name: 'Więcej narzędzi mapy' }))

    expect(screen.getByText('Zaktualizuj pozycję auta')).toBeInTheDocument()
    expect(screen.getByText('Wyślij SMS z lokalizacją')).toBeInTheDocument()
  })

  it('menu narzędzi pozwala przełączyć warstwę mapy', () => {
    const onChangeMapLayer = vi.fn()
    render(<MapHeaderActions {...baseProps} onChangeMapLayer={onChangeMapLayer} />)

    fireEvent.click(screen.getByRole('button', { name: 'Więcej narzędzi mapy' }))
    fireEvent.click(screen.getByText('Terenowa'))

    expect(onChangeMapLayer).toHaveBeenCalledWith('topo')
  })

  it('blokuje przełącznik mapy cieplnej, gdy znalezisk jest mniej niż próg', () => {
    render(<MapHeaderActions {...baseProps} findingsCount={3} />)

    fireEvent.click(screen.getByRole('button', { name: 'Więcej narzędzi mapy' }))

    expect(screen.getByRole('menuitemcheckbox', { name: /Mapa cieplna \(min\./ })).toHaveAttribute(
      'aria-disabled',
      'true',
    )
  })

  it('pozwala przełączyć mapę cieplną, gdy znalezisk jest wystarczająco', () => {
    const onToggleHeatmapView = vi.fn()
    render(<MapHeaderActions {...baseProps} findingsCount={20} onToggleHeatmapView={onToggleHeatmapView} />)

    fireEvent.click(screen.getByRole('button', { name: 'Więcej narzędzi mapy' }))
    fireEvent.click(screen.getByRole('menuitemcheckbox', { name: 'Mapa cieplna znalezisk' }))

    expect(onToggleHeatmapView).toHaveBeenCalledOnce()
  })

  it('menu narzędzi pozwala odfiltrować gatunek i wyczyścić filtr', () => {
    const onToggleSpeciesFilter = vi.fn()
    const onClearSpeciesFilter = vi.fn()
    render(
      <MapHeaderActions
        {...baseProps}
        speciesOptions={[
          { id: 'borowik', nameCommon: 'Borowik szlachetny', nameLatin: '', edibility: 'jadalny', description: '', habitat: '', season: '', lookalikes: [], imageUrls: [] },
        ]}
        speciesFilterIds={new Set(['borowik'])}
        onToggleSpeciesFilter={onToggleSpeciesFilter}
        onClearSpeciesFilter={onClearSpeciesFilter}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Więcej narzędzi mapy' }))
    fireEvent.click(screen.getByRole('menuitemcheckbox', { name: 'Borowik szlachetny' }))
    expect(onToggleSpeciesFilter).toHaveBeenCalledWith('borowik')

    fireEvent.click(screen.getByText('Wyczyść'))
    expect(onClearSpeciesFilter).toHaveBeenCalledOnce()
  })

  it('menu narzędzi pozwala zmienić tryb oszczędzania baterii', () => {
    const onChangePowerSaveMode = vi.fn()
    render(<MapHeaderActions {...baseProps} onChangePowerSaveMode={onChangePowerSaveMode} />)

    fireEvent.click(screen.getByRole('button', { name: 'Więcej narzędzi mapy' }))
    fireEvent.click(screen.getByText('Zawsze włączone'))

    expect(onChangePowerSaveMode).toHaveBeenCalledWith('always')
  })

  it('pokazuje "(aktywne)" przy oszczędzaniu baterii, gdy jest włączone', () => {
    render(<MapHeaderActions {...baseProps} powerSaveActive />)

    fireEvent.click(screen.getByRole('button', { name: 'Więcej narzędzi mapy' }))

    expect(screen.getByText(/Oszczędzanie baterii \(aktywne\)/)).toBeInTheDocument()
  })
})
