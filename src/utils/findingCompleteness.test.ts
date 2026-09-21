import { describe, it, expect } from 'vitest'
import { filterIncompleteFindings, isIncompleteFinding } from './findingCompleteness'
import type { Finding } from '../db/schema'

function makeFinding(overrides: Partial<Finding>): Finding {
  return { id: 1, speciesId: 'borowik-szlachetny', speciesNameGuess: 'Borowik', latitude: null, longitude: null, notes: '', createdAt: 0, ...overrides }
}

describe('isIncompleteFinding', () => {
  it('niekompletne, gdy brak gatunku', () => {
    const finding = makeFinding({ speciesId: null })
    expect(isIncompleteFinding(finding, new Set([1]))).toBe(true)
  })

  it('niekompletne, gdy brak zdjęcia', () => {
    const finding = makeFinding({ id: 5 })
    expect(isIncompleteFinding(finding, new Set())).toBe(true)
  })

  it('kompletne, gdy jest gatunek i zdjęcie', () => {
    const finding = makeFinding({ id: 5 })
    expect(isIncompleteFinding(finding, new Set([5]))).toBe(false)
  })
})

describe('filterIncompleteFindings', () => {
  it('zwraca tylko niekompletne znaleziska', () => {
    const complete = makeFinding({ id: 1 })
    const noSpecies = makeFinding({ id: 2, speciesId: null })
    const noPhoto = makeFinding({ id: 3 })
    const result = filterIncompleteFindings([complete, noSpecies, noPhoto], new Set([1]))
    expect(result.map((f) => f.id)).toEqual([2, 3])
  })
})
