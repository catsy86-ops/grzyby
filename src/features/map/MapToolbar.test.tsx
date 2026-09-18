import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MapToolbar } from './MapToolbar'

const baseProps = {
  userPosition: null,
  hasReturnPoint: false,
  isListView: false,
  onToggleListView: vi.fn(),
  onLocate: vi.fn(),
  onOpenSheet: vi.fn(),
  onSaveReturnPoint: vi.fn(),
  onAddFinding: vi.fn(),
  mapLayerId: 'street' as const,
  onChangeMapLayer: vi.fn(),
  findingsCount: 0,
  isHeatmapView: false,
  onToggleHeatmapView: vi.fn(),
  speciesOptions: [],
  speciesFilterIds: new Set<string>(),
  onToggleSpeciesFilter: vi.fn(),
  onClearSpeciesFilter: vi.fn(),
}

describe('MapToolbar', () => {
  afterEach(() => cleanup())

  it('pokazuje etykietę "Pokaż listę..." w widoku mapy i wywołuje onToggleListView', () => {
    const onToggleListView = vi.fn()
    render(<MapToolbar {...baseProps} onToggleListView={onToggleListView} />)

    const toggle = screen.getByRole('button', { name: /Pokaż listę znalezisk i grzybowisk/ })
    fireEvent.click(toggle)
    expect(onToggleListView).toHaveBeenCalledOnce()
  })

  it('pokazuje etykietę "Pokaż mapę" w widoku listy', () => {
    render(<MapToolbar {...baseProps} isListView />)
    expect(screen.getByRole('button', { name: 'Pokaż mapę' })).toBeInTheDocument()
  })

  it('wywołuje onLocate po kliknięciu "Zlokalizuj mnie"', () => {
    const onLocate = vi.fn()
    render(<MapToolbar {...baseProps} onLocate={onLocate} />)

    fireEvent.click(screen.getByRole('button', { name: 'Zlokalizuj mnie' }))
    expect(onLocate).toHaveBeenCalledOnce()
  })

  it('wywołuje onAddFinding po kliknięciu FAB "Dodaj znalezisko"', () => {
    const onAddFinding = vi.fn()
    render(<MapToolbar {...baseProps} onAddFinding={onAddFinding} />)

    fireEvent.click(screen.getByRole('button', { name: 'Dodaj znalezisko' }))
    expect(onAddFinding).toHaveBeenCalledOnce()
  })

  it('menu narzędzi otwiera akcje offline/grzybowiska/auto i pomija SMS bez znanej pozycji', () => {
    const onOpenSheet = vi.fn()
    render(<MapToolbar {...baseProps} onOpenSheet={onOpenSheet} userPosition={null} />)

    fireEvent.click(screen.getByRole('button', { name: 'Więcej narzędzi mapy' }))

    expect(screen.getByText('Pobierz obszar offline')).toBeInTheDocument()
    expect(screen.getByText('Grzybowiska')).toBeInTheDocument()
    expect(screen.getByText('Zapisz pozycję auta')).toBeInTheDocument()
    expect(screen.queryByText('Wyślij SMS z lokalizacją')).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('Pobierz obszar offline'))
    expect(onOpenSheet).toHaveBeenCalledWith('offline-download')
  })

  it('menu narzędzi pokazuje "Zaktualizuj pozycję auta" i opcję SMS, gdy pozycja jest znana', () => {
    render(<MapToolbar {...baseProps} hasReturnPoint userPosition={[52, 21]} />)

    fireEvent.click(screen.getByRole('button', { name: 'Więcej narzędzi mapy' }))

    expect(screen.getByText('Zaktualizuj pozycję auta')).toBeInTheDocument()
    expect(screen.getByText('Wyślij SMS z lokalizacją')).toBeInTheDocument()
  })

  it('menu narzędzi pozwala przełączyć warstwę mapy', () => {
    const onChangeMapLayer = vi.fn()
    render(<MapToolbar {...baseProps} onChangeMapLayer={onChangeMapLayer} />)

    fireEvent.click(screen.getByRole('button', { name: 'Więcej narzędzi mapy' }))
    fireEvent.click(screen.getByText('Terenowa'))

    expect(onChangeMapLayer).toHaveBeenCalledWith('topo')
  })

  it('blokuje przełącznik mapy cieplnej, gdy znalezisk jest mniej niż próg', () => {
    render(<MapToolbar {...baseProps} findingsCount={3} />)

    fireEvent.click(screen.getByRole('button', { name: 'Więcej narzędzi mapy' }))

    expect(screen.getByRole('menuitemcheckbox', { name: /Mapa cieplna \(min\./ })).toHaveAttribute(
      'aria-disabled',
      'true',
    )
  })

  it('pozwala przełączyć mapę cieplną, gdy znalezisk jest wystarczająco', () => {
    const onToggleHeatmapView = vi.fn()
    render(<MapToolbar {...baseProps} findingsCount={20} onToggleHeatmapView={onToggleHeatmapView} />)

    fireEvent.click(screen.getByRole('button', { name: 'Więcej narzędzi mapy' }))
    fireEvent.click(screen.getByRole('menuitemcheckbox', { name: 'Mapa cieplna znalezisk' }))

    expect(onToggleHeatmapView).toHaveBeenCalledOnce()
  })

  it('menu narzędzi pozwala odfiltrować gatunek i wyczyścić filtr', () => {
    const onToggleSpeciesFilter = vi.fn()
    const onClearSpeciesFilter = vi.fn()
    render(
      <MapToolbar
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
})
