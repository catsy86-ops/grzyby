import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/db'
import { getSpeciesSpotHistory } from './speciesSpotHistory'

describe('getSpeciesSpotHistory', () => {
  beforeEach(async () => {
    await db.transaction('rw', db.spots, db.findings, async () => {
      await db.spots.clear()
      await db.findings.clear()
    })
  })

  it('zwraca puste, gdy brak znalezisk danego gatunku', async () => {
    expect(await getSpeciesSpotHistory('borowik-szlachetny')).toEqual([])
  })

  it('pomija znaleziska bez przypisanego grzybowiska', async () => {
    await db.findings.add({
      speciesId: 'borowik-szlachetny',
      speciesNameGuess: null,
      latitude: 1,
      longitude: 1,
      notes: '',
      createdAt: 100,
    })

    expect(await getSpeciesSpotHistory('borowik-szlachetny')).toEqual([])
  })

  it('grupuje znaleziska tego gatunku per grzybowisko, licząc i datę ostatniego znaleziska', async () => {
    const spotId = await db.spots.add({ name: 'Sosnowy zagajnik', latitude: 1, longitude: 1, notes: '', createdAt: 1 })
    await db.findings.add({
      speciesId: 'borowik-szlachetny',
      speciesNameGuess: null,
      latitude: 1,
      longitude: 1,
      notes: '',
      createdAt: 100,
      spotId,
    })
    await db.findings.add({
      speciesId: 'borowik-szlachetny',
      speciesNameGuess: null,
      latitude: 1,
      longitude: 1,
      notes: '',
      createdAt: 200,
      spotId,
    })

    const history = await getSpeciesSpotHistory('borowik-szlachetny')

    expect(history).toEqual([{ spotId, spotName: 'Sosnowy zagajnik', count: 2, lastFoundAt: 200 }])
  })

  it('pomija znaleziska innych gatunków i sortuje wynik od najnowszego', async () => {
    const spotA = await db.spots.add({ name: 'A', latitude: 1, longitude: 1, notes: '', createdAt: 1 })
    const spotB = await db.spots.add({ name: 'B', latitude: 2, longitude: 2, notes: '', createdAt: 1 })
    await db.findings.add({
      speciesId: 'borowik-szlachetny',
      speciesNameGuess: null,
      latitude: 1,
      longitude: 1,
      notes: '',
      createdAt: 100,
      spotId: spotA,
    })
    await db.findings.add({
      speciesId: 'borowik-szlachetny',
      speciesNameGuess: null,
      latitude: 2,
      longitude: 2,
      notes: '',
      createdAt: 300,
      spotId: spotB,
    })
    await db.findings.add({
      speciesId: 'inny-gatunek',
      speciesNameGuess: null,
      latitude: 2,
      longitude: 2,
      notes: '',
      createdAt: 500,
      spotId: spotB,
    })

    const history = await getSpeciesSpotHistory('borowik-szlachetny')

    expect(history.map((h) => h.spotName)).toEqual(['B', 'A'])
  })
})
