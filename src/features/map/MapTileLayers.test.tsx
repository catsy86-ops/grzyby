import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { MapContainer } from 'react-leaflet'
import { getMapLayer, getMapOverlays } from '../../data/mapLayers'
import { MapTileLayer } from './MapTileLayers'

function renderInMap(children: React.ReactNode) {
  return render(
    <MapContainer center={[53.4, 14.6]} zoom={15} style={{ height: 300, width: 300 }}>
      {children}
    </MapContainer>,
  )
}

describe('MapTileLayer', () => {
  afterEach(() => cleanup())

  it('podkład dostaje klasę map-layer--<id> (filtry kolorów z index.css)', () => {
    const { container } = renderInMap(<MapTileLayer def={getMapLayer('satellite')} />)

    const layer = container.querySelector('.map-layer--satellite')
    expect(layer).not.toBeNull()
    expect(layer).not.toHaveClass('map-overlay')
  })

  it('nakładka dostaje klasę map-overlay--<id>, bez klasy podkładu - kolory zgodne z legendą', () => {
    const [forest] = getMapOverlays(['forest'])
    const { container } = renderInMap(<MapTileLayer def={forest} />)

    const layer = container.querySelector('.map-overlay--forest')
    expect(layer).not.toBeNull()
    expect(layer).not.toHaveClass('map-layer')
  })

  it('podkład ma własny z-index 1, nakładka 10 - kafle podkładu nie przykrywają nakładki', () => {
    const [forest] = getMapOverlays(['forest'])
    const { container } = renderInMap(
      <>
        <MapTileLayer def={getMapLayer('satellite')} />
        <MapTileLayer def={forest} />
      </>,
    )

    expect((container.querySelector('.map-layer--satellite') as HTMLElement).style.zIndex).toBe('1')
    expect((container.querySelector('.map-overlay--forest') as HTMLElement).style.zIndex).toBe('10')
  })

  it('kolejność nakładek wynika z zIndex, nie z kolejności włączania - szlaki nad drzewostanami', () => {
    const [forest, trails] = getMapOverlays(['forest', 'trails'])
    // Szlaki włączone PRZED drzewostanami - i tak mają być wyżej.
    const { container } = renderInMap(
      <>
        <MapTileLayer def={trails} />
        <MapTileLayer def={forest} />
      </>,
    )

    const trailsZ = Number((container.querySelector('.map-overlay--trails') as HTMLElement).style.zIndex)
    const forestZ = Number((container.querySelector('.map-overlay--forest') as HTMLElement).style.zIndex)
    expect(trailsZ).toBeGreaterThan(forestZ)
  })
})
