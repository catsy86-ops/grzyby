import { render, screen, waitFor } from '@testing-library/react'
import { Suspense } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { lazyRetry } from './lazyRetry'
import { ErrorBoundary } from '../components/ErrorBoundary'

const FLAG_KEY = 'lysy-chunk-reload-attempted'

describe('lazyRetry', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renderuje komponent normalnie, gdy import się udaje, i czyści flagę przeładowania', async () => {
    sessionStorage.setItem(FLAG_KEY, '1')
    const Comp = lazyRetry(() => Promise.resolve({ default: () => <p>Załadowano</p> }))

    const { findByText } = render(
      <Suspense fallback="ładowanie">
        <Comp />
      </Suspense>,
    )

    expect(await findByText('Załadowano')).toBeInTheDocument()
    expect(sessionStorage.getItem(FLAG_KEY)).toBeNull()
  })

  it('przy pierwszym błędzie importu ustawia flagę i przeładowuje stronę zamiast rzucać błąd', async () => {
    const reloadSpy = vi.fn()
    vi.stubGlobal('location', { ...window.location, reload: reloadSpy })

    const Comp = lazyRetry(() => Promise.reject(new Error('chunk load failed')))

    render(
      <Suspense fallback="ładowanie">
        <Comp />
      </Suspense>,
    )

    await waitFor(() => expect(reloadSpy).toHaveBeenCalledOnce())
    expect(sessionStorage.getItem(FLAG_KEY)).toBe('1')
  })

  it('rzuca błąd dalej do ErrorBoundary zamiast przeładować ponownie, gdy jedna próba już nie pomogła', async () => {
    sessionStorage.setItem(FLAG_KEY, '1')
    const reloadSpy = vi.fn()
    vi.stubGlobal('location', { ...window.location, reload: reloadSpy })
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const Comp = lazyRetry(() => Promise.reject(new Error('nadal się nie ładuje')))

    render(
      <ErrorBoundary>
        <Suspense fallback="ładowanie">
          <Comp />
        </Suspense>
      </ErrorBoundary>,
    )

    expect(await screen.findByText('Coś poszło nie tak')).toBeInTheDocument()
    expect(reloadSpy).not.toHaveBeenCalled()
    consoleErrorSpy.mockRestore()
  })
})
