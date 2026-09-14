import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ThemeProvider } from 'next-themes'
import { ThemeToggle } from './ThemeToggle'

beforeEach(() => {
  // jsdom nie implementuje matchMedia - next-themes go wywołuje nawet z enableSystem={false}.
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    })),
  )
})

function renderWithTheme(defaultTheme: string) {
  return render(
    <ThemeProvider attribute="class" defaultTheme={defaultTheme} enableSystem={false}>
      <ThemeToggle />
    </ThemeProvider>,
  )
}

describe('ThemeToggle', () => {
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    document.documentElement.classList.remove('dark')
    localStorage.clear()
  })

  it('pokazuje ikonę księżyca i przełącza na ciemny motyw po kliknięciu', async () => {
    renderWithTheme('light')

    const button = await screen.findByRole('button', { name: 'Przełącz na ciemny motyw' })
    fireEvent.click(button)

    await waitFor(() => expect(document.documentElement.classList.contains('dark')).toBe(true))
    expect(await screen.findByRole('button', { name: 'Przełącz na jasny motyw' })).toBeInTheDocument()
  })

  it('pokazuje ikonę słońca i przełącza na jasny motyw po kliknięciu', async () => {
    renderWithTheme('dark')

    const button = await screen.findByRole('button', { name: 'Przełącz na jasny motyw' })
    fireEvent.click(button)

    await waitFor(() => expect(document.documentElement.classList.contains('dark')).toBe(false))
    expect(await screen.findByRole('button', { name: 'Przełącz na ciemny motyw' })).toBeInTheDocument()
  })
})
