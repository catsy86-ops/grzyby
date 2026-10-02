import { describe, expect, it } from 'vitest'
import type { Species } from '../db/schema'
import speciesData from './species.json'
import { getSpeciesForTree, SPECIES_TREES } from './speciesTrees'

const species = speciesData as Species[]

describe('speciesTrees', () => {
  it('każde id istnieje w species.json', () => {
    const ids = new Set(species.map((s) => s.id))
    for (const id of Object.keys(SPECIES_TREES)) expect(ids.has(id), id).toBe(true)
  })

  it('dzieli gatunki spod sosny na jadalne i trujące', () => {
    const { edible, dangerous } = getSpeciesForTree('SO')
    expect(edible.map((s) => s.id)).toContain('podgrzybek-brunatny')
    expect(dangerous.map((s) => s.id)).toContain('gaska-zielonka')
    expect(edible.every((s) => s.edibility === 'jadalny' || s.edibility === 'warunkowo-jadalny')).toBe(true)
  })

  it('ostrzega przed muchomorem sromotnikowym pod dębem', () => {
    expect(getSpeciesForTree('DB').dangerous.map((s) => s.id)).toContain('muchomor-sromotnikowy')
  })

  it('nie podpowiada gatunków chronionych jako "do zbioru"', () => {
    for (const tree of ['SO', 'DB', 'BK', 'GB'] as const) {
      expect(getSpeciesForTree(tree).edible.some((s) => s.legalProtection)).toBe(false)
    }
  })
})
