import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../db/db'
import { JournalView } from './JournalView'
import * as geolocation from '../../utils/geolocation'

vi.mock('../../utils/geolocation', () => ({
  getCurrentPosition: vi.fn(),
}))

async function addFinding(overrides: Partial<Parameters<typeof db.findings.add>[0]> = {}) {
  return db.findings.add({
    speciesId: null,
    speciesNameGuess: 'Testowe znalezisko',
    latitude: 52.1,
    longitude: 19.5,
    notes: 'Notatka',
    createdAt: Date.now(),
    ...overrides,
  })
}

describe('JournalView - edycja lokalizacji i zdjęcia', () => {
  beforeEach(async () => {
    await db.transaction('rw', db.findings, db.trips, db.photos, async () => {
      await db.findings.clear()
      await db.trips.clear()
      await db.photos.clear()
    })
    vi.mocked(geolocation.getCurrentPosition).mockReset()
  })

  afterEach(() => {
    cleanup()
  })

  it('pokazuje aktualną lokalizację w trybie edycji i pozwala ją zaktualizować przez GPS', async () => {
    const id = await addFinding({ latitude: 52.1, longitude: 19.5 })
    vi.mocked(geolocation.getCurrentPosition).mockResolvedValue({ latitude: 53.4, longitude: 14.5 })

    render(<JournalView />)
    fireEvent.click(await screen.findByText('Edytuj'))

    expect(screen.getByText('52.10000, 19.50000')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Użyj obecnej (GPS)' }))

    await waitFor(() => expect(screen.getByText('53.40000, 14.50000')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: 'Zapisz' }))

    await waitFor(async () => {
      const finding = await db.findings.get(id)
      expect(finding?.latitude).toBe(53.4)
      expect(finding?.longitude).toBe(14.5)
    })
  })

  it('pozwala usunąć lokalizację znaleziska', async () => {
    const id = await addFinding({ latitude: 52.1, longitude: 19.5 })

    render(<JournalView />)
    fireEvent.click(await screen.findByText('Edytuj'))

    const locationRow = screen.getByText('52.10000, 19.50000').closest('div')!
    fireEvent.click(within(locationRow).getByRole('button', { name: 'Usuń' }))

    expect(screen.getByText('Brak lokalizacji')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Zapisz' }))

    await waitFor(async () => {
      const finding = await db.findings.get(id)
      expect(finding?.latitude).toBeNull()
      expect(finding?.longitude).toBeNull()
    })
  })

  it('pozwala usunąć istniejące zdjęcie znaleziska', async () => {
    const id = await addFinding()
    await db.photos.add({
      findingId: id,
      blob: new Blob(['full']),
      thumbnailBlob: new Blob(['thumb']),
    })

    render(<JournalView />)
    fireEvent.click(await screen.findByText('Edytuj'))

    fireEvent.click(await screen.findByRole('button', { name: 'Usuń obecne zdjęcie' }))
    expect(screen.getByText('Zdjęcie zostanie usunięte po zapisaniu.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Zapisz' }))

    await waitFor(async () => {
      expect(await db.photos.where('findingId').equals(id).count()).toBe(0)
    })
  })

  it('nie pokazuje przycisku usuwania zdjęcia, gdy znalezisko go nie ma', async () => {
    await addFinding()

    render(<JournalView />)
    fireEvent.click(await screen.findByText('Edytuj'))

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Usuń obecne zdjęcie' })).not.toBeInTheDocument()
    })
  })

  it('pokazuje komunikat błędu, gdy ustalenie lokalizacji GPS się nie powiedzie', async () => {
    await addFinding()
    vi.mocked(geolocation.getCurrentPosition).mockRejectedValue(new Error('Brak sygnału GPS'))

    render(<JournalView />)
    fireEvent.click(await screen.findByText('Edytuj'))
    fireEvent.click(screen.getByRole('button', { name: 'Użyj obecnej (GPS)' }))

    await waitFor(() => expect(screen.getByRole('button', { name: 'Użyj obecnej (GPS)' })).not.toBeDisabled())
  })
})
