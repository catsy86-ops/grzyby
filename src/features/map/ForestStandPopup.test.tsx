import { cleanup, render, screen } from '@testing-library/react'
import { MapContainer } from 'react-leaflet'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ForestStandPopup } from './ForestStandPopup'

const POSITION: [number, number] = [53.36, 14.66]

function stub(body: string, ok = true) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok, status: ok ? 200 : 500, text: () => Promise.resolve(body) }))
}

function renderPopup() {
  return render(
    <MapContainer center={POSITION} zoom={15} style={{ height: 300, width: 300 }}>
      <ForestStandPopup position={POSITION} />
    </MapContainer>,
  )
}

describe('ForestStandPopup', () => {
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('pokazuje drzewostan, gatunki typowe i ostrzeżenie o trujących', async () => {
    stub(
      JSON.stringify({
        features: [{ properties: { species_cd_d: 'SO', species_age: '97', site_type_cd: 'BŚW', sub_area: '7,52' } }],
      }),
    )
    renderPopup()
    expect(await screen.findByText(/Sosna/)).toHaveTextContent('Sosna, 97 lat')
    expect(screen.getByText('bór świeży · 7,52 ha')).toBeInTheDocument()
    expect(screen.getByText(/Podgrzybek brunatny/)).toBeInTheDocument()
    expect(screen.getByText(/Uwaga, trujące/).parentElement).toHaveTextContent('Gąska zielonka')
  })

  it('informuje o braku wydzielenia w tym miejscu', async () => {
    stub('{ "features": [] }')
    renderPopup()
    expect(await screen.findByText(/Brak danych o drzewostanie/)).toBeInTheDocument()
  })

  it('informuje o błędzie sieci', async () => {
    stub('', false)
    renderPopup()
    expect(await screen.findByText(/wymaga internetu/)).toBeInTheDocument()
  })
})
