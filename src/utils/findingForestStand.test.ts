import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../db/db'
import { useAppStore } from '../stores/appStore'
import { attachForestStand, backfillForestStands, describeForestStand, needsForestStand } from './findingForestStand'

const STAND_RESPONSE = JSON.stringify({
  features: [{ properties: { species_cd_d: 'BK', species_age: '136', site_type_cd: 'LŚW', sub_area: '18,08' } }],
})

async function addFinding() {
  return (await db.findings.add({
    speciesId: null,
    speciesNameGuess: null,
    latitude: 53.34,
    longitude: 14.69,
    notes: '',
    createdAt: 1,
  })) as number
}

describe('attachForestStand', () => {
  beforeEach(async () => {
    await db.findings.clear()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve(STAND_RESPONSE) }))
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    useAppStore.setState({ mapOverlayIds: [] })
  })

  it('dopisuje drzewostan, gdy nakładka Drzewostany jest włączona', async () => {
    useAppStore.setState({ mapOverlayIds: ['forest'] })
    const id = await addFinding()
    await attachForestStand(id, 53.34, 14.69)
    expect((await db.findings.get(id))?.forestStand).toEqual({ treeCode: 'BK', treeName: 'Buk', age: 136, siteType: 'las świeży' })
  })

  it('nie wysyła współrzędnych do BDL bez włączonej nakładki', async () => {
    const id = await addFinding()
    await attachForestStand(id, 53.34, 14.69)
    expect(fetch).not.toHaveBeenCalled()
    expect((await db.findings.get(id))?.forestStand).toBeUndefined()
  })

  it('cicho ignoruje błąd sieci', async () => {
    useAppStore.setState({ mapOverlayIds: ['forest'] })
    vi.mocked(fetch).mockRejectedValue(new TypeError('Failed to fetch'))
    const id = await addFinding()
    await expect(attachForestStand(id, 53.34, 14.69)).resolves.toBeUndefined()
    expect((await db.findings.get(id))?.forestStand).toBeUndefined()
  })
})

const EMPTY_RESPONSE = JSON.stringify({ features: [] })

describe('backfillForestStands', () => {
  beforeEach(async () => {
    await db.findings.clear()
  })
  afterEach(() => vi.unstubAllGlobals())

  it('uzupełnia tylko niesprawdzone znaleziska z lokalizacją i zapisuje null poza lasem', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({ ok: true, text: () => Promise.resolve(STAND_RESPONSE) })
        .mockResolvedValueOnce({ ok: true, text: () => Promise.resolve(EMPTY_RESPONSE) }),
    )
    const inForest = await addFinding()
    const outside = await addFinding()
    const noLocation = (await db.findings.add({ speciesId: null, speciesNameGuess: null, latitude: null, longitude: null, notes: '', createdAt: 2 })) as number
    const alreadyChecked = (await db.findings.add({ speciesId: null, speciesNameGuess: null, latitude: 53, longitude: 14, notes: '', createdAt: 3, forestStand: null })) as number

    const onProgress = vi.fn()
    const result = await backfillForestStands(await db.findings.toArray(), onProgress, new AbortController().signal)

    expect(result).toEqual({ checked: 2, failed: 0 })
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(onProgress).toHaveBeenLastCalledWith(2, 2)
    expect((await db.findings.get(inForest))?.forestStand?.treeCode).toBe('BK')
    expect((await db.findings.get(outside))?.forestStand).toBeNull()
    expect(needsForestStand((await db.findings.get(outside))!)).toBe(false)
    expect((await db.findings.get(noLocation))?.forestStand).toBeUndefined()
    expect((await db.findings.get(alreadyChecked))?.forestStand).toBeNull()
  })

  it('przy błędzie sieci zostawia pole niesprawdzone (do ponowienia) i liczy porażki', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    const id = await addFinding()
    const result = await backfillForestStands(await db.findings.toArray(), vi.fn(), new AbortController().signal)
    expect(result).toEqual({ checked: 0, failed: 1 })
    expect((await db.findings.get(id))?.forestStand).toBeUndefined()
  })

  it('przerywa po abort', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve(STAND_RESPONSE) }))
    await addFinding()
    await addFinding()
    const controller = new AbortController()
    controller.abort()
    await backfillForestStands(await db.findings.toArray(), vi.fn(), controller.signal)
    expect(fetch).not.toHaveBeenCalled()
  })
})

describe('describeForestStand', () => {
  it('opisuje drzewostan "pod czym", z wiekiem i siedliskiem', () => {
    expect(describeForestStand({ treeCode: 'BK', treeName: 'Buk', age: 136, siteType: 'las świeży' })).toBe(
      'pod bukiem, 136 lat · las świeży',
    )
    expect(describeForestStand({ treeCode: null, treeName: 'CZR', age: null, siteType: null })).toBe('drzewostan CZR')
  })
})
