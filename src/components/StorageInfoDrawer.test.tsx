import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { StorageInfoDrawer } from './StorageInfoDrawer'
import { Toaster } from './ui/sonner'
import * as storageInfo from '../utils/storageInfo'

function renderDrawer() {
  return render(
    <>
      <StorageInfoDrawer open onOpenChange={vi.fn()} />
      <Toaster />
    </>,
  )
}

vi.mock('../utils/storageInfo', async () => {
  const actual = await vi.importActual<typeof import('../utils/storageInfo')>('../utils/storageInfo')
  return {
    ...actual,
    getCacheInfo: vi.fn(),
    getStorageEstimate: vi.fn(),
    clearCache: vi.fn(),
  }
})

describe('StorageInfoDrawer', () => {
  beforeEach(() => {
    // jsdom nie implementuje matchMedia - sonner Toaster go wywołuje przy montowaniu.
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

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('pokazuje listę cache i pozwala wyczyścić jeden z nich', async () => {
    vi.mocked(storageInfo.getCacheInfo).mockResolvedValue([
      { name: 'map-tiles', label: 'Kafelki mapy (offline)', entryCount: 12, sizeBytes: 5 * 1024 * 1024 },
    ])
    vi.mocked(storageInfo.getStorageEstimate).mockResolvedValue({ usageBytes: 1024, quotaBytes: 2048 })
    vi.mocked(storageInfo.clearCache).mockResolvedValue(undefined)

    renderDrawer()

    fireEvent.click(await screen.findByRole('button', { name: 'Wyczyść' }))
    const confirmButtons = await screen.findAllByRole('button', { name: 'Wyczyść' })
    fireEvent.click(confirmButtons[confirmButtons.length - 1])

    await waitFor(() => expect(storageInfo.clearCache).toHaveBeenCalledWith('map-tiles'))
    expect(await screen.findByText(/Wyczyszczono/)).toBeInTheDocument()
  })

  it('pokazuje komunikat błędu, gdy czyszczenie cache się nie powiedzie', async () => {
    vi.mocked(storageInfo.getCacheInfo).mockResolvedValue([
      { name: 'ai-model', label: 'Model rozpoznawania AI', entryCount: 3, sizeBytes: null },
    ])
    vi.mocked(storageInfo.getStorageEstimate).mockResolvedValue(null)
    vi.mocked(storageInfo.clearCache).mockRejectedValue(new Error('boom'))

    renderDrawer()

    fireEvent.click(await screen.findByRole('button', { name: 'Wyczyść' }))
    const confirmButtons = await screen.findAllByRole('button', { name: 'Wyczyść' })
    fireEvent.click(confirmButtons[confirmButtons.length - 1])

    expect(await screen.findByText(/Nie udało się wyczyścić/)).toBeInTheDocument()
  })

  it('pokazuje informację o braku danych offline, gdy cache są puste', async () => {
    vi.mocked(storageInfo.getCacheInfo).mockResolvedValue([])
    vi.mocked(storageInfo.getStorageEstimate).mockResolvedValue(null)

    renderDrawer()

    expect(await screen.findByText('Brak zapisanych danych offline.')).toBeInTheDocument()
  })

  it('pokazuje liczbę plików i rozmiar w bajtach jako osobne, opisane wartości', async () => {
    vi.mocked(storageInfo.getCacheInfo).mockResolvedValue([
      { name: 'map-tiles', label: 'Kafelki mapy (offline)', entryCount: 12, sizeBytes: 5 * 1024 * 1024 },
    ])
    vi.mocked(storageInfo.getStorageEstimate).mockResolvedValue(null)

    renderDrawer()

    expect(await screen.findByText('12 plików · 5.0 MB')).toBeInTheDocument()
  })

  it('pomija rozmiar w bajtach, gdy nie udało się go ustalić', async () => {
    vi.mocked(storageInfo.getCacheInfo).mockResolvedValue([
      { name: 'ai-model', label: 'Model rozpoznawania AI', entryCount: 1, sizeBytes: null },
    ])
    vi.mocked(storageInfo.getStorageEstimate).mockResolvedValue(null)

    renderDrawer()

    expect(await screen.findByText('1 plik')).toBeInTheDocument()
  })
})
