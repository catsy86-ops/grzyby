import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { OfflineAreaDownload } from './OfflineAreaDownload'
import * as offlineMapTiles from '../../utils/offlineMapTiles'

vi.mock('../../utils/offlineMapTiles', async () => {
  const actual = await vi.importActual<typeof import('../../utils/offlineMapTiles')>('../../utils/offlineMapTiles')
  return {
    ...actual,
    downloadTilesForOfflineUse: vi.fn(),
  }
})

const CENTER: [number, number] = [53.4285, 14.5528]

describe('OfflineAreaDownload', () => {
  beforeEach(() => {
    vi.mocked(offlineMapTiles.downloadTilesForOfflineUse).mockReset()
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true })
  })

  afterEach(() => cleanup())

  it('pokazuje szacowaną liczbę kafelków i rozmiar dla domyślnego promienia', async () => {
    render(<OfflineAreaDownload open onOpenChange={vi.fn()} getCenter={() => CENTER} />)

    expect(await screen.findByText(/kafelków, ok\./)).toBeInTheDocument()
  })

  it('pokazuje ostrzeżenie offline i blokuje przycisk pobierania, gdy brak sieci', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })
    render(<OfflineAreaDownload open onOpenChange={vi.fn()} getCenter={() => CENTER} />)

    expect(await screen.findByText(/Jesteś offline/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pobierz' })).toBeDisabled()
  })

  it('pokazuje błąd, gdy nie udało się ustalić środka mapy', async () => {
    render(<OfflineAreaDownload open onOpenChange={vi.fn()} getCenter={() => null} />)

    fireEvent.click(await screen.findByRole('button', { name: 'Pobierz' }))

    expect(await screen.findByText(/Nie udało się ustalić środka mapy/)).toBeInTheDocument()
    expect(offlineMapTiles.downloadTilesForOfflineUse).not.toHaveBeenCalled()
  })

  it('pobiera obszar, pokazuje postęp i zamyka panel po sukcesie', async () => {
    let resolveDownload: (result: offlineMapTiles.DownloadResult) => void = () => {}
    vi.mocked(offlineMapTiles.downloadTilesForOfflineUse).mockImplementation(
      (tiles, onProgress) =>
        new Promise((resolve) => {
          onProgress?.({ downloaded: 1, total: tiles.length, failed: 0 })
          resolveDownload = resolve
        }),
    )
    const onOpenChange = vi.fn()
    render(<OfflineAreaDownload open onOpenChange={onOpenChange} getCenter={() => CENTER} />)

    fireEvent.click(await screen.findByRole('button', { name: 'Pobierz' }))

    expect(await screen.findByText(/1 \//)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Anuluj pobieranie' })).toBeInTheDocument()

    resolveDownload({ downloaded: 10, total: 10, failed: 0, failedTiles: [] })

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
  })

  it('po częściowym niepowodzeniu pokazuje przycisk "Ponów nieudane" i ponawia tylko te kafelki', async () => {
    const failedTiles: offlineMapTiles.TileCoord[] = [{ z: 13, x: 1, y: 1 }]
    vi.mocked(offlineMapTiles.downloadTilesForOfflineUse).mockResolvedValueOnce({
      downloaded: 9,
      total: 10,
      failed: 1,
      failedTiles,
    })
    render(<OfflineAreaDownload open onOpenChange={vi.fn()} getCenter={() => CENTER} />)

    fireEvent.click(await screen.findByRole('button', { name: 'Pobierz' }))

    const retryButton = await screen.findByRole('button', { name: /Ponów nieudane \(1\)/ })

    vi.mocked(offlineMapTiles.downloadTilesForOfflineUse).mockResolvedValueOnce({
      downloaded: 1,
      total: 1,
      failed: 0,
      failedTiles: [],
    })
    fireEvent.click(retryButton)

    await waitFor(() =>
      expect(offlineMapTiles.downloadTilesForOfflineUse).toHaveBeenLastCalledWith(
        failedTiles,
        expect.any(Function),
        expect.anything(),
      ),
    )
  })

  it('anulowanie pobierania pokazuje komunikat i nie zamyka panelu jak przy sukcesie', async () => {
    vi.mocked(offlineMapTiles.downloadTilesForOfflineUse).mockImplementation((_tiles, _onProgress, signal) => {
      return new Promise((_resolve, reject) => {
        signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
      })
    })
    const onOpenChange = vi.fn()
    render(<OfflineAreaDownload open onOpenChange={onOpenChange} getCenter={() => CENTER} />)

    fireEvent.click(await screen.findByRole('button', { name: 'Pobierz' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Anuluj pobieranie' }))

    await waitFor(() => expect(screen.getByRole('button', { name: 'Pobierz' })).toBeInTheDocument())
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
  })

  it('pokazuje błąd, gdy pobieranie rzuci wyjątek', async () => {
    vi.mocked(offlineMapTiles.downloadTilesForOfflineUse).mockRejectedValue(new Error('Sieć padła'))
    render(<OfflineAreaDownload open onOpenChange={vi.fn()} getCenter={() => CENTER} />)

    fireEvent.click(await screen.findByRole('button', { name: 'Pobierz' }))

    expect(await screen.findByText('Sieć padła')).toBeInTheDocument()
  })

  it('zmiana presetu promienia jest zablokowana w trakcie pobierania', async () => {
    vi.mocked(offlineMapTiles.downloadTilesForOfflineUse).mockImplementation(() => new Promise(() => {}))
    render(<OfflineAreaDownload open onOpenChange={vi.fn()} getCenter={() => CENTER} />)

    fireEvent.click(await screen.findByRole('button', { name: 'Pobierz' }))

    await waitFor(() => expect(screen.getByRole('button', { name: '2 km' })).toBeDisabled())
  })
})
