import { afterEach, describe, expect, it, vi } from 'vitest'
import { getPersistenceStatus, requestPersistentStorage } from './persistentStorage'

function stubStorage(storage: Partial<StorageManager> | undefined) {
  vi.stubGlobal('navigator', { ...navigator, storage })
}

describe('persistentStorage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('zwraca "unsupported", gdy przeglądarka nie ma Storage API', async () => {
    stubStorage(undefined)
    expect(await getPersistenceStatus()).toBe('unsupported')
    expect(await requestPersistentStorage()).toBe('unsupported')
  })

  it('nie prosi ponownie, gdy dane są już trwałe', async () => {
    const persist = vi.fn(async () => true)
    stubStorage({ persisted: vi.fn(async () => true), persist })
    expect(await requestPersistentStorage()).toBe('persisted')
    expect(persist).not.toHaveBeenCalled()
  })

  it('prosi o trwałość i zwraca wynik decyzji przeglądarki', async () => {
    stubStorage({ persisted: vi.fn(async () => false), persist: vi.fn(async () => true) })
    expect(await requestPersistentStorage()).toBe('persisted')

    stubStorage({ persisted: vi.fn(async () => false), persist: vi.fn(async () => false) })
    expect(await requestPersistentStorage()).toBe('not-persisted')
  })

  it('połyka błąd persist() zamiast go rzucać', async () => {
    stubStorage({
      persisted: vi.fn(async () => false),
      persist: vi.fn(async () => {
        throw new Error('boom')
      }),
    })
    expect(await requestPersistentStorage()).toBe('not-persisted')
  })
})
