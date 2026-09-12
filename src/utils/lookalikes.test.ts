import { describe, expect, it } from 'vitest'
import type { Species } from '../db/schema'
import { getLookalikes, hasDangerousLookalike } from './lookalikes'

function makeSpecies(overrides: Partial<Species>): Species {
  return {
    id: 'x',
    nameCommon: 'X',
    nameLatin: 'X x',
    edibility: 'jadalny',
    description: '',
    habitat: '',
    season: '',
    lookalikes: [],
    imageUrls: [],
    ...overrides,
  }
}

describe('getLookalikes', () => {
  const deadly = makeSpecies({ id: 'deadly', edibility: 'śmiertelnie-trujący' })
  const edible = makeSpecies({ id: 'edible', edibility: 'jadalny' })
  const all = [deadly, edible]

  it('mapuje id sobowtórów na obiekty gatunków z flagą niebezpieczeństwa', () => {
    const target = makeSpecies({ id: 'target', lookalikes: ['deadly', 'edible'] })
    const result = getLookalikes(target, all)
    expect(result).toEqual([
      { species: deadly, dangerous: true },
      { species: edible, dangerous: false },
    ])
  })

  it('pomija nieznane id gatunków', () => {
    const target = makeSpecies({ id: 'target', lookalikes: ['nieistniejacy'] })
    expect(getLookalikes(target, all)).toEqual([])
  })

  it('zwraca pustą listę, gdy brak sobowtórów', () => {
    const target = makeSpecies({ id: 'target', lookalikes: [] })
    expect(getLookalikes(target, all)).toEqual([])
  })
})

describe('hasDangerousLookalike', () => {
  const deadly = makeSpecies({ id: 'deadly', edibility: 'śmiertelnie-trujący' })
  const poisonous = makeSpecies({ id: 'poisonous', edibility: 'trujący' })
  const edible = makeSpecies({ id: 'edible', edibility: 'jadalny' })
  const all = [deadly, poisonous, edible]

  it('zwraca true, gdy istnieje śmiertelnie trujący sobowtór', () => {
    const target = makeSpecies({ id: 'target', lookalikes: ['deadly'] })
    expect(hasDangerousLookalike(target, all)).toBe(true)
  })

  it('zwraca true, gdy istnieje trujący (nie tylko śmiertelnie trujący) sobowtór', () => {
    const target = makeSpecies({ id: 'target', lookalikes: ['poisonous'] })
    expect(hasDangerousLookalike(target, all)).toBe(true)
  })

  it('zwraca false, gdy wszystkie sobowtóry są bezpieczne', () => {
    const target = makeSpecies({ id: 'target', lookalikes: ['edible'] })
    expect(hasDangerousLookalike(target, all)).toBe(false)
  })
})
