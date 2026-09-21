import { describe, it, expect, beforeEach, vi } from 'vitest'
import { consumeSharedPhoto, SHARED_PHOTO_CACHE_KEY } from './sharedPhoto'

// jsdom nie implementuje Cache API - minimalny mock w pamięci, ten sam wzorzec co
// offlineMapTiles.test.ts/storageInfo.test.ts w tym repo.
function createFakeCacheStorage() {
  const store = new Map<string, Response>()
  const cache = {
    match: vi.fn(async (key: string) => store.get(key)),
    put: vi.fn(async (key: string, response: Response) => {
      store.set(key, response)
    }),
    delete: vi.fn(async (key: string) => store.delete(key)),
  }
  return { open: vi.fn(async () => cache) }
}

describe('consumeSharedPhoto', () => {
  beforeEach(() => {
    vi.stubGlobal('caches', createFakeCacheStorage())
  })

  it('zwraca null, gdy nic nie zostało udostępnione', async () => {
    expect(await consumeSharedPhoto()).toBeNull()
  })

  it('odczytuje i usuwa udostępnione zdjęcie z cache', async () => {
    const cacheStorage = window.caches as unknown as { open: (n: string) => Promise<Cache> }
    const cache = await cacheStorage.open('shared-photo')
    const blob = new Blob(['dane-zdjecia'], { type: 'image/png' })
    await cache.put(SHARED_PHOTO_CACHE_KEY, new Response(blob, { headers: { 'Content-Type': 'image/png' } }))

    const file = await consumeSharedPhoto()
    expect(file).not.toBeNull()
    expect(file?.type).toBe('image/png')

    // Drugi odczyt powinien być pusty - wpis jest jednorazowy.
    expect(await consumeSharedPhoto()).toBeNull()
  })
})
