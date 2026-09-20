import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../db/db'
import { useAppStore } from '../stores/appStore'
import { NotificationCenter } from './NotificationCenter'

beforeEach(async () => {
  await db.transaction('rw', db.findings, db.trips, db.spots, async () => {
    await db.findings.clear()
    await db.trips.clear()
    await db.spots.clear()
  })
  localStorage.clear()
  useAppStore.setState({ lastExportAt: null, activeTripId: null, activeTab: 'mapa' })
  vi.restoreAllMocks()
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

afterEach(() => cleanup())

describe('NotificationCenter', () => {
  it('pokazuje "Nic nie wymaga uwagi", gdy brak powiadomień', async () => {
    render(<NotificationCenter open onOpenChange={vi.fn()} />)
    expect(await screen.findByText('Nic nie wymaga uwagi.')).toBeInTheDocument()
  })

  it('pokazuje przypomnienie o backupie, gdy warunki są spełnione', async () => {
    await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        db.findings.add({
          speciesId: null,
          speciesNameGuess: null,
          latitude: null,
          longitude: null,
          notes: '',
          createdAt: i,
        }),
      ),
    )

    render(<NotificationCenter open onOpenChange={vi.fn()} />)

    expect(await screen.findByText('Zrób backup dziennika')).toBeInTheDocument()
  })

  it('eksportuje dane i zamyka panel po kliknięciu "Eksportuj"', async () => {
    await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        db.findings.add({
          speciesId: null,
          speciesNameGuess: null,
          latitude: null,
          longitude: null,
          notes: '',
          createdAt: i,
        }),
      ),
    )
    const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    const onOpenChange = vi.fn()

    render(<NotificationCenter open onOpenChange={onOpenChange} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Eksportuj' }))

    await waitFor(() => expect(createObjectURLSpy).toHaveBeenCalled())
    expect(useAppStore.getState().lastExportAt).not.toBeNull()
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('przełącza na zakładkę Mapa i zamyka panel po kliknięciu "Przejdź" przy przeciągającej się wyprawie', async () => {
    const tripId = await db.trips.add({
      name: 'Testowa',
      startedAt: Date.now() - 60_000,
      endedAt: null,
      notes: '',
      plannedReturnAt: Date.now() - 1000,
    })
    useAppStore.setState({ activeTripId: tripId, activeTab: 'dziennik' })
    const onOpenChange = vi.fn()

    render(<NotificationCenter open onOpenChange={onOpenChange} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Przejdź' }))

    expect(useAppStore.getState().activeTab).toBe('mapa')
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
