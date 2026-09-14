import { afterEach, describe, expect, it, vi } from 'vitest'
import speciesData from '../data/species.json'
import { rankPredictions } from './mushroomModel'

describe('rankPredictions', () => {
  it('sortuje wyniki malejąco po pewności', () => {
    const scores = [0.1, 0.7, 0.2, 0.0, 0.0, 0.0]
    const results = rankPredictions(scores)

    expect(results[0].confidence).toBe(0.7)
    expect(results[1].confidence).toBe(0.2)
    expect(results[2].confidence).toBe(0.1)
  })

  it('zwraca tylko topN wyników', () => {
    const scores = [0.5, 0.4, 0.3, 0.2, 0.1, 0.05]
    const results = rankPredictions(scores, 2)

    expect(results).toHaveLength(2)
    expect(results[0].confidence).toBe(0.5)
    expect(results[1].confidence).toBe(0.4)
  })

  it('mapuje indeks klasy na odpowiedni gatunek z species.json', () => {
    const scores = new Array(speciesData.length).fill(0)
    scores[0] = 1
    const results = rankPredictions(scores, 1)

    expect(results[0].species?.id).toBe(speciesData[0].id)
    expect(results[0].labelRaw).toBe(speciesData[0].id)
  })

  it('zwraca species null i etykietę zastępczą dla indeksu spoza listy gatunków', () => {
    const scores = new Array(speciesData.length + 1).fill(0)
    scores[scores.length - 1] = 1
    const results = rankPredictions(scores, 1)

    expect(results[0].species).toBeNull()
    expect(results[0].labelRaw).toMatch(/^klasa-\d+$/)
  })

  it('przyjmuje niestandardową kolejność etykiet (np. z metadata.json)', () => {
    const customOrder = [...speciesData.map((s) => s.id)].reverse()
    const scores = new Array(customOrder.length).fill(0)
    scores[0] = 1
    const results = rankPredictions(scores, 1, customOrder)

    expect(results[0].species?.id).toBe(customOrder[0])
  })
})

describe('loadClassLabels', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('zwraca domyślną kolejność (species.json), gdy metadata.json nie istnieje', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('not found', { status: 404 })))
    const { loadClassLabels: loadLabels } = await import('./mushroomModel')

    await expect(loadLabels()).resolves.toEqual(speciesData.map((s) => s.id))
  })

  it('używa kolejności z metadata.json, gdy jest dostępny i poprawny', async () => {
    const customOrder = [...speciesData.map((s) => s.id)].reverse()
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ labels: customOrder }), { status: 200 })),
    )
    const { loadClassLabels: loadLabels } = await import('./mushroomModel')

    await expect(loadLabels()).resolves.toEqual(customOrder)
  })

  it('ignoruje metadata.json z niepoprawnym kształtem i wraca do domyślnej kolejności', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ labels: 'nie-tablica' }), { status: 200 })),
    )
    const { loadClassLabels: loadLabels } = await import('./mushroomModel')

    await expect(loadLabels()).resolves.toEqual(speciesData.map((s) => s.id))
  })
})

describe('isModelAvailable', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('zwraca true, gdy model.json odpowiada OK', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 200 })))
    const { isModelAvailable: check } = await import('./mushroomModel')

    await expect(check()).resolves.toBe(true)
  })

  it('zwraca false, gdy zapytanie się nie powiedzie', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline') }))
    const { isModelAvailable: check } = await import('./mushroomModel')

    await expect(check()).resolves.toBe(false)
  })

  it('odpytuje sieć tylko raz, kolejne wywołania używają cache', async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const { isModelAvailable: check } = await import('./mushroomModel')

    await check()
    await check()
    await check()

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
