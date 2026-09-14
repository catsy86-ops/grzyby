import { afterEach, describe, expect, it, vi } from 'vitest'
import { clearCache, formatStorageBytes, getCacheInfo, getStorageEstimate } from './storageInfo'

describe('getCacheInfo', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function mockCacheWithSizes(sizes: number[]) {
    const keys = sizes.map((_, i) => `key-${i}`)
    return {
      keys: vi.fn(async () => keys),
      match: vi.fn(async (key: string) => {
        const index = keys.indexOf(key)
        return new Response(null, { headers: { 'content-length': String(sizes[index]) } })
      }),
    }
  }

  it('zwraca liczbę wpisów dla każdego zarządzanego cache', async () => {
    vi.stubGlobal('caches', {
      open: vi.fn(async (name: string) =>
        name === 'map-tiles' ? mockCacheWithSizes(new Array(42).fill(100)) : mockCacheWithSizes(new Array(3).fill(50)),
      ),
    })

    const info = await getCacheInfo()

    expect(info).toEqual([
      { name: 'map-tiles', label: 'Kafelki mapy (offline)', entryCount: 42, sizeBytes: 4200 },
      { name: 'ai-model', label: 'Model rozpoznawania AI', entryCount: 3, sizeBytes: 150 },
    ])
  })

  it('sumuje rozmiar wpisów z nagłówka content-length osobno od liczby plików', async () => {
    vi.stubGlobal('caches', {
      open: vi.fn(async () => mockCacheWithSizes([1000, 2000, 3000])),
    })

    const info = await getCacheInfo()

    expect(info[0].entryCount).toBe(3)
    expect(info[0].sizeBytes).toBe(6000)
  })

  it('zwraca sizeBytes null, gdy rozmiaru żadnego wpisu nie udało się ustalić', async () => {
    vi.stubGlobal('caches', {
      open: vi.fn(async () => ({
        keys: vi.fn(async () => ['key-0']),
        match: vi.fn(async () => undefined),
      })),
    })

    const info = await getCacheInfo()

    expect(info[0].sizeBytes).toBeNull()
  })

  it('zwraca 0 wpisów, gdy otwarcie cache się nie powiedzie', async () => {
    vi.stubGlobal('caches', { open: vi.fn(async () => Promise.reject(new Error('boom'))) })

    const info = await getCacheInfo()

    expect(info.every((c) => c.entryCount === 0 && c.sizeBytes === null)).toBe(true)
  })

  it('zwraca pustą listę, gdy Cache Storage jest niedostępne', async () => {
    vi.stubGlobal('caches', undefined)

    await expect(getCacheInfo()).resolves.toEqual([])
  })
})

describe('getStorageEstimate', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('zwraca usage/quota z navigator.storage.estimate()', async () => {
    vi.stubGlobal('navigator', {
      ...navigator,
      storage: { estimate: vi.fn(async () => ({ usage: 1000, quota: 5000 })) },
    })

    await expect(getStorageEstimate()).resolves.toEqual({ usageBytes: 1000, quotaBytes: 5000 })
  })

  it('zwraca null, gdy navigator.storage.estimate nie jest wspierane', async () => {
    vi.stubGlobal('navigator', { ...navigator, storage: undefined })

    await expect(getStorageEstimate()).resolves.toBeNull()
  })
})

describe('clearCache', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('wywołuje caches.delete z podaną nazwą', async () => {
    const deleteFn = vi.fn(async () => true)
    vi.stubGlobal('caches', { delete: deleteFn })

    await clearCache('map-tiles')

    expect(deleteFn).toHaveBeenCalledWith('map-tiles')
  })
})

describe('formatStorageBytes', () => {
  it('formatuje małe rozmiary w KB, duże w MB', () => {
    expect(formatStorageBytes(500 * 1024)).toBe('500 KB')
    expect(formatStorageBytes(5 * 1024 * 1024)).toBe('5.0 MB')
  })
})
