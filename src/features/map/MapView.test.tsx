import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../db/db'
import { MapView } from './MapView'

// `watchPosition` uruchamiałby prawdziwe API geolokalizacji (niedostępne w jsdom) - no-op stub
// wystarcza, bo ten test sprawdza samo złożenie widoku (Faza 19), nie logikę GPS (patrz
// useMapGeolocation.test.ts dla tamtej części).
vi.mock('../../utils/geolocation', () => ({
  getCurrentPosition: vi.fn().mockRejectedValue(new Error('brak GPS w teście')),
  watchPosition: vi.fn(() => () => {}),
}))

// Pogoda (Open-Meteo) wymaga sieci - poza zakresem tego testu, mockowana żeby nie odpalać
// prawdziwego fetch w jsdom.
vi.mock('../../hooks/useMushroomOutlook', () => ({
  useMushroomOutlook: () => null,
}))

describe('MapView (test dymny po refaktoryzacji Fazy 19)', () => {
  beforeEach(async () => {
    await db.transaction('rw', db.spots, db.findings, async () => {
      await db.spots.clear()
      await db.findings.clear()
    })
  })

  afterEach(() => cleanup())

  // Akcje "Zlokalizuj mnie"/"Więcej narzędzi mapy" są portalowane do nagłówka aplikacji (patrz
  // MapHeaderActions.tsx + `headerActionsSlot` w MapView.tsx) - w testach ten węzeł DOM trzeba
  // dostarczyć ręcznie (App.tsx robi to przez `ref`), inaczej portal nie ma dokąd renderować.
  function renderMapView() {
    const headerActionsSlot = document.createElement('div')
    document.body.appendChild(headerActionsSlot)
    return render(<MapView headerActionsSlot={headerActionsSlot} />)
  }

  it('renderuje się bez wyjątku i pokazuje przyciski akcji', async () => {
    renderMapView()

    expect(await screen.findByRole('button', { name: /Dodaj znalezisko/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Zlokalizuj mnie' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Więcej narzędzi mapy' })).toBeInTheDocument()
  })

  it('przełącza się na widok-listę i z powrotem na mapę', async () => {
    renderMapView()

    const toggle = await screen.findByRole('button', { name: /Pokaż listę/ })
    act(() => toggle.click())

    expect(await screen.findByText(/Grzybowiska \(0\)/)).toBeInTheDocument()
    expect(screen.getByText(/Znaleziska na mapie \(0\)/)).toBeInTheDocument()

    act(() => screen.getByRole('button', { name: /Pokaż mapę/ }).click())
    expect(screen.queryByText(/Grzybowiska \(0\)/)).not.toBeInTheDocument()
  })
})
