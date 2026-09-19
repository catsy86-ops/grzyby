import { describe, expect, it } from 'vitest'
import { buildQuizPairs, pickRandomPair } from './lookalikeQuiz'
import type { Species } from '../db/schema'

function makeSpecies(id: string, lookalikes: string[] = [], hasImage = true): Species {
  return {
    id,
    nameCommon: id,
    nameLatin: id,
    edibility: 'jadalny',
    description: '',
    habitat: '',
    season: '',
    lookalikes,
    imageUrls: hasImage ? ['img.jpg'] : [],
  }
}

describe('buildQuizPairs', () => {
  it('builds one pair per valid lookalike reference', () => {
    const a = makeSpecies('a', ['b', 'c'])
    const b = makeSpecies('b')
    const c = makeSpecies('c')
    const pairs = buildQuizPairs([a, b, c])
    expect(pairs).toHaveLength(2)
    expect(pairs.map((p) => p.decoy.id)).toEqual(['b', 'c'])
  })

  it('skips unknown lookalike ids', () => {
    const a = makeSpecies('a', ['ghost'])
    expect(buildQuizPairs([a])).toHaveLength(0)
  })

  it('skips pairs missing a photo on either side', () => {
    const a = makeSpecies('a', ['b'])
    const b = makeSpecies('b', [], false)
    expect(buildQuizPairs([a, b])).toHaveLength(0)
  })
})

describe('pickRandomPair', () => {
  it('returns null for an empty list', () => {
    expect(pickRandomPair([])).toBeNull()
  })

  it('returns one of the given pairs', () => {
    const a = makeSpecies('a', ['b'])
    const b = makeSpecies('b')
    const pairs = buildQuizPairs([a, b])
    expect(pickRandomPair(pairs)).toBe(pairs[0])
  })
})
