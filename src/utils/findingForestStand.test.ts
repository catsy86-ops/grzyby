import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../db/db'
import { useAppStore } from '../stores/appStore'
import { attachForestStand, describeForestStand } from './findingForestStand'

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

describe('describeForestStand', () => {
  it('opisuje drzewostan "pod czym", z wiekiem i siedliskiem', () => {
    expect(describeForestStand({ treeCode: 'BK', treeName: 'Buk', age: 136, siteType: 'las świeży' })).toBe(
      'pod bukiem, 136 lat · las świeży',
    )
    expect(describeForestStand({ treeCode: null, treeName: 'CZR', age: null, siteType: null })).toBe('drzewostan CZR')
  })
})
