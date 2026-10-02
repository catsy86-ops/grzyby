import type { TileErrorEvent } from 'leaflet'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { retryWmsTile } from './wmsTileRetry'

const TILE_URL = 'https://wms.example.test/wms?service=WMS&request=GetMap&bbox=1,2,3,4'

function failTile(img: HTMLImageElement) {
  retryWmsTile({ tile: img } as unknown as TileErrorEvent)
  vi.runAllTimers()
}

describe('retryWmsTile', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('ponawia kafel z parametrem retry, zachowując resztę zapytania', () => {
    const img = document.createElement('img')
    img.src = TILE_URL
    failTile(img)
    const url = new URL(img.src)
    expect(url.searchParams.get('retry')).toBe('1')
    expect(url.searchParams.get('bbox')).toBe('1,2,3,4')
  })

  it('przestaje ponawiać po 3 próbach', () => {
    const img = document.createElement('img')
    img.src = TILE_URL
    for (let i = 0; i < 5; i++) failTile(img)
    expect(new URL(img.src).searchParams.get('retry')).toBe('3')
  })

  it('nie ponawia bez sieci', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    const img = document.createElement('img')
    img.src = TILE_URL
    failTile(img)
    expect(img.src).toBe(TILE_URL)
    vi.restoreAllMocks()
  })
})
