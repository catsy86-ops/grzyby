import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from './db/db'
import { useAppStore } from './stores/appStore'
import App from './App'

// Ten sam wzorzec co MapView.test.tsx - watchPosition/GPS niedostępne w jsdom, pogoda wymaga
// sieci, poza zakresem tego testu (sprawdza samą nawigację między zakładkami, nie logikę mapy).
vi.mock('./utils/geolocation', () => ({
  getCurrentPosition: vi.fn().mockRejectedValue(new Error('brak GPS w teście')),
  watchPosition: vi.fn(() => () => {}),
}))
vi.mock('./hooks/useMushroomOutlook', () => ({
  useMushroomOutlook: () => null,
  readCachedMushroomOutlookLabel: () => null,
}))

beforeEach(async () => {
  await db.transaction('rw', db.spots, db.findings, db.trips, async () => {
    await db.spots.clear()
    await db.findings.clear()
    await db.trips.clear()
  })
  useAppStore.setState({ activeTab: 'mapa' })
  localStorage.setItem('lysy-onboarding-seen', '1')
  sessionStorage.setItem('lysy-splash-seen', '1')
})

afterEach(() => cleanup())

describe('App - nawigacja między zakładkami', () => {
  it('renderuje domyślnie zakładkę Mapa i zmienia widok po kliknięciu innej zakładki', async () => {
    render(<App />)

    // Dwa paski nawigacji (mobile + desktop side-rail) są zamontowane naraz - `getAllByRole`
    // zamiast `getByRole`, patrz App.tsx komentarz o współdzielonym stanie obu.
    const dziennikButtons = await screen.findAllByRole('button', { name: 'Dziennik' })
    expect(dziennikButtons.length).toBeGreaterThan(0)

    fireEvent.click(dziennikButtons[0])

    await waitFor(() => expect(screen.getByText('Dziennik zbiorów')).toBeInTheDocument(), { timeout: 3000 })
  })

  it('zachowuje wcześniej odwiedzoną zakładkę zamontowaną (nie unmountuje) po powrocie', async () => {
    render(<App />)

    const dziennikButtons = await screen.findAllByRole('button', { name: 'Dziennik' })
    fireEvent.click(dziennikButtons[0])
    await waitFor(() => expect(screen.getByText('Dziennik zbiorów')).toBeInTheDocument(), { timeout: 3000 })

    const mapaButtons = screen.getAllByRole('button', { name: 'Mapa' })
    fireEvent.click(mapaButtons[0])

    // Dziennik nie unmountuje się - jego nagłówek zostaje w DOM, tylko ukryty przez atrybut
    // `hidden` na rodzicu (`getByText` nie filtruje po widoczności, w odróżnieniu od `getByRole`,
    // więc wciąż go znajdzie mimo `display: none`).
    expect(screen.getByText('Dziennik zbiorów')).toBeInTheDocument()
  })

  it('ogłasza zmianę zakładki w regionie aria-live', async () => {
    render(<App />)

    const dziennikButtons = await screen.findAllByRole('button', { name: 'Dziennik' })
    fireEvent.click(dziennikButtons[0])

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Dziennik, widok załadowany'))
  })

  // `supportsViewTransitions` w App.tsx jest stałą modułową liczoną RAZ przy imporcie - żeby
  // przetestować obie ścieżki, trzeba ustawić `document.startViewTransition` PRZED importem i
  // wymusić świeży import modułu (`vi.resetModules`), inaczej oba warianty testowałyby dokładnie
  // ten sam, już obliczony branch.
  it('działa poprawnie bez View Transitions API (ścieżka fallback)', async () => {
    vi.resetModules()
    // @ts-expect-error - symulacja przeglądarki bez wsparcia (Firefox/starsze Safari)
    delete document.startViewTransition

    const { default: FreshApp } = await import('./App')
    render(<FreshApp />)
    const dziennikButtons = await screen.findAllByRole('button', { name: 'Dziennik' })
    fireEvent.click(dziennikButtons[0])
    await waitFor(() => expect(screen.getByText('Dziennik zbiorów')).toBeInTheDocument(), { timeout: 3000 })
  })

  it('używa document.startViewTransition, gdy dostępne (ścieżka Chromium)', async () => {
    vi.resetModules()
    const startViewTransition = vi.fn((callback: () => void) => {
      act(() => callback())
      return { ready: Promise.resolve(), finished: Promise.resolve(), updateCallbackDone: Promise.resolve() }
    })
    // @ts-expect-error - jsdom nie implementuje View Transitions API, dodajemy stub na potrzeby testu
    document.startViewTransition = startViewTransition

    const { default: FreshApp } = await import('./App')
    render(<FreshApp />)
    const dziennikButtons = await screen.findAllByRole('button', { name: 'Dziennik' })
    fireEvent.click(dziennikButtons[0])

    expect(startViewTransition).toHaveBeenCalledOnce()
    await waitFor(() => expect(screen.getByText('Dziennik zbiorów')).toBeInTheDocument(), { timeout: 3000 })

    // @ts-expect-error - sprzątanie stuba
    delete document.startViewTransition
  })
})
