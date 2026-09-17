import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type L from 'leaflet'
import { MapContainer, TileLayer } from 'react-leaflet'
import { FindingMarkers, FindingsHeatmap, MapClickHandler, MapInstanceCapture, RecenterOnLocate } from './MapLayers'
import type { Finding } from '../../db/schema'

function makeFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    id: 1,
    speciesId: null,
    speciesNameGuess: 'Borowik?',
    latitude: 52.0,
    longitude: 21.0,
    notes: '',
    createdAt: Date.now(),
    ...overrides,
  }
}

// FindingMarkers/MapClickHandler/MapInstanceCapture zależą od useMap() - jak w MapView.test.tsx,
// jedyny sposób ich wyrenderowania to prawdziwy <MapContainer> (ResizeObserver mock w
// vitest.setup.ts to umożliwia).
function renderInMap(children: React.ReactNode) {
  return render(
    <MapContainer center={[52, 21]} zoom={14} style={{ height: 300, width: 300 }}>
      <TileLayer url="https://example.test/{z}/{x}/{y}.png" />
      {children}
    </MapContainer>,
  )
}

describe('FindingMarkers', () => {
  afterEach(() => cleanup())

  it('renderuje osobną pinezkę dla każdego oddalonego od siebie znaleziska', async () => {
    renderInMap(
      <FindingMarkers
        findings={[
          makeFinding({ id: 1, latitude: 52.0, longitude: 21.0 }),
          makeFinding({ id: 2, latitude: 40.0, longitude: 10.0 }),
        ]}
      />,
    )

    expect(await screen.findAllByRole('img', { name: /Znalezisko, nieokreślony gatunek/ })).toHaveLength(2)
  })

  it('grupuje znalezisk w tym samym miejscu w jedną ikonę klastra', async () => {
    renderInMap(
      <FindingMarkers
        findings={[
          makeFinding({ id: 1, latitude: 52.0, longitude: 21.0 }),
          makeFinding({ id: 2, latitude: 52.0, longitude: 21.0 }),
          makeFinding({ id: 3, latitude: 52.0, longitude: 21.0 }),
        ]}
      />,
    )

    expect(await screen.findByRole('img', { name: 'Grupa 3 znalezisk' })).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: /Znalezisko/ })).not.toBeInTheDocument()
  })

  it('pomija znaleziska bez lokalizacji', () => {
    renderInMap(<FindingMarkers findings={[makeFinding({ id: 1, latitude: null, longitude: null })]} />)

    expect(screen.queryByRole('img', { name: /Znalezisko/ })).not.toBeInTheDocument()
  })
})

describe('FindingsHeatmap', () => {
  afterEach(() => cleanup())

  it('rysuje jeden okrąg na oddalone od siebie znalezisko', () => {
    const { container } = renderInMap(
      <FindingsHeatmap
        findings={[
          makeFinding({ id: 1, latitude: 52.0, longitude: 21.0 }),
          makeFinding({ id: 2, latitude: 40.0, longitude: 10.0 }),
        ]}
      />,
    )

    expect(container.querySelectorAll('.leaflet-overlay-pane path')).toHaveLength(2)
  })

  it('grupuje znalezisk w tym samym miejscu w jeden, większy okrąg', () => {
    const { container: manyContainer } = renderInMap(
      <FindingsHeatmap
        findings={[
          makeFinding({ id: 1, latitude: 52.0, longitude: 21.0 }),
          makeFinding({ id: 2, latitude: 52.0, longitude: 21.0 }),
          makeFinding({ id: 3, latitude: 52.0, longitude: 21.0 }),
        ]}
      />,
    )
    const paths = manyContainer.querySelectorAll('.leaflet-overlay-pane path')
    expect(paths).toHaveLength(1)
  })

  it('pomija znaleziska bez lokalizacji', () => {
    const { container } = renderInMap(
      <FindingsHeatmap findings={[makeFinding({ id: 1, latitude: null, longitude: null })]} />,
    )

    expect(container.querySelectorAll('.leaflet-overlay-pane path')).toHaveLength(0)
  })
})

describe('MapInstanceCapture', () => {
  afterEach(() => cleanup())

  it('wywołuje onReady z instancją mapy przy montowaniu i z null przy odmontowaniu', async () => {
    const onReady = vi.fn()
    const { unmount } = renderInMap(<MapInstanceCapture onReady={onReady} />)

    await act(async () => {})
    expect(onReady).toHaveBeenCalledWith(expect.objectContaining({ setView: expect.any(Function) }))

    unmount()
    expect(onReady).toHaveBeenLastCalledWith(null)
  })
})

describe('MapClickHandler', () => {
  afterEach(() => cleanup())

  it('wywołuje onPick po kliknięciu mapy, tylko gdy enabled', async () => {
    let map: L.Map | null = null
    const onPick = vi.fn()
    renderInMap(
      <>
        <MapInstanceCapture onReady={(m) => (map = m)} />
        <MapClickHandler enabled={false} onPick={onPick} />
      </>,
    )
    await act(async () => {})

    act(() => {
      map!.fire('click', { latlng: { lat: 1, lng: 2 } })
    })
    expect(onPick).not.toHaveBeenCalled()
  })

  it('wywołuje onPick z pozycją kliknięcia, gdy enabled', async () => {
    let map: L.Map | null = null
    const onPick = vi.fn()
    renderInMap(
      <>
        <MapInstanceCapture onReady={(m) => (map = m)} />
        <MapClickHandler enabled onPick={onPick} />
      </>,
    )
    await act(async () => {})

    act(() => {
      map!.fire('click', { latlng: { lat: 1, lng: 2 } })
    })
    expect(onPick).toHaveBeenCalledWith([1, 2])
  })
})

describe('RecenterOnLocate', () => {
  afterEach(() => cleanup())

  it('nie rzuca wyjątku, gdy pozycja jest null', async () => {
    renderInMap(<RecenterOnLocate position={null} />)
    await act(async () => {})
  })
})
