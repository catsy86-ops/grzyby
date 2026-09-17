import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  computeTilesForArea,
  downloadTilesForOfflineUse,
  estimateDownloadSizeBytes,
  formatBytes,
  MAX_OFFLINE_TILES,
  OFFLINE_ZOOM_MAX,
  OFFLINE_ZOOM_MIN,
} from './offlineMapTiles'

describe('computeTilesForArea', () => {
  it('zwraca kafelki dla każdego poziomu zoomu w domyślnym zakresie', () => {
    const tiles = computeTilesForArea([52.0693, 19.4803], 2)
    const zoomLevels = new Set(tiles.map((t) => t.z))

    expect(zoomLevels.size).toBe(OFFLINE_ZOOM_MAX - OFFLINE_ZOOM_MIN + 1)
    expect(Math.min(...zoomLevels)).toBe(OFFLINE_ZOOM_MIN)
    expect(Math.max(...zoomLevels)).toBe(OFFLINE_ZOOM_MAX)
  })

  it('większy promień daje więcej kafelków', () => {
    const small = computeTilesForArea([52.0693, 19.4803], 2)
    const large = computeTilesForArea([52.0693, 19.4803], 10)

    expect(large.length).toBeGreaterThan(small.length)
  })

  it('nie zwraca duplikatów kafelków', () => {
    const tiles = computeTilesForArea([52.0693, 19.4803], 5)
    const keys = tiles.map((t) => `${t.z}/${t.x}/${t.y}`)

    expect(new Set(keys).size).toBe(keys.length)
  })
})

describe('estimateDownloadSizeBytes / formatBytes', () => {
  it('szacuje rozmiar proporcjonalnie do liczby kafelków', () => {
    expect(estimateDownloadSizeBytes(100)).toBeGreaterThan(estimateDownloadSizeBytes(10))
  })

  it('formatuje małe rozmiary w KB, duże w MB', () => {
    expect(formatBytes(500 * 1024)).toBe('500 KB')
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB')
  })
})

describe('downloadTilesForOfflineUse', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function mockCachesAndFetch({ alreadyCached = false, failRate = 0 } = {}) {
    const putCalls: string[] = []
    const cache = {
      match: vi.fn(async () => (alreadyCached ? new Response('cached') : undefined)),
      put: vi.fn(async (url: string) => {
        putCalls.push(url)
      }),
    }
    vi.stubGlobal('caches', { open: vi.fn(async () => cache) })

    let call = 0
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        call++
        const shouldFail = failRate > 0 && call % Math.round(1 / failRate) === 0
        return new Response('tile', { status: shouldFail ? 500 : 200 })
      }),
    )

    return { cache, putCalls }
  }

  it('pobiera i cache’uje wszystkie kafelki, gdy żaden nie jest jeszcze zapisany', async () => {
    const { putCalls } = mockCachesAndFetch()
    const tiles = [
      { z: 14, x: 1, y: 1 },
      { z: 14, x: 1, y: 2 },
      { z: 14, x: 2, y: 1 },
    ]

    const result = await downloadTilesForOfflineUse(tiles)

    expect(result).toEqual({ downloaded: 3, total: 3, failed: 0, failedTiles: [] })
    expect(putCalls).toHaveLength(3)
  })

  it('pomija kafelki już zapisane w cache (nie wywołuje fetch ponownie dla nich)', async () => {
    mockCachesAndFetch({ alreadyCached: true })
    const tiles = [{ z: 14, x: 1, y: 1 }]

    const result = await downloadTilesForOfflineUse(tiles)

    expect(result).toEqual({ downloaded: 1, total: 1, failed: 0, failedTiles: [] })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('zlicza nieudane pobrania zamiast przerywać całość i zwraca ich listę', async () => {
    mockCachesAndFetch({ failRate: 1 })
    const tiles = [{ z: 14, x: 1, y: 1 }]

    const result = await downloadTilesForOfflineUse(tiles)

    expect(result).toEqual({ downloaded: 1, total: 1, failed: 1, failedTiles: tiles })
  })

  it('zgłasza postęp przez callback', async () => {
    mockCachesAndFetch()
    const tiles = [
      { z: 14, x: 1, y: 1 },
      { z: 14, x: 1, y: 2 },
    ]
    const onProgress = vi.fn()

    await downloadTilesForOfflineUse(tiles, onProgress)

    expect(onProgress).toHaveBeenCalledTimes(2)
    expect(onProgress).toHaveBeenLastCalledWith({ downloaded: 2, total: 2, failed: 0 })
  })

  it('odrzuca, gdy liczba kafelków przekracza limit', async () => {
    mockCachesAndFetch()
    const tooMany = Array.from({ length: MAX_OFFLINE_TILES + 1 }, (_, i) => ({ z: 14, x: i, y: 0 }))

    await expect(downloadTilesForOfflineUse(tooMany)).rejects.toThrow(/Zbyt duży obszar/)
  })

  it('domyślnie pobiera z kafelków OpenStreetMap', async () => {
    mockCachesAndFetch()
    await downloadTilesForOfflineUse([{ z: 14, x: 1, y: 2 }])

    expect(fetch).toHaveBeenCalledWith('https://a.tile.openstreetmap.org/14/1/2.png', expect.anything())
  })

  it('pobiera z przekazanego szablonu URL innej warstwy (np. OpenTopoMap)', async () => {
    mockCachesAndFetch()
    await downloadTilesForOfflineUse(
      [{ z: 14, x: 1, y: 2 }],
      undefined,
      undefined,
      'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    )

    expect(fetch).toHaveBeenCalledWith('https://a.tile.opentopomap.org/14/1/2.png', expect.anything())
  })
})
