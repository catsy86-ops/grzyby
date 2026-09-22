import { describe, expect, it } from 'vitest'
import { normalizeForSearch } from './normalizeForSearch'

describe('normalizeForSearch', () => {
  it('usuwa polskie znaki diakrytyczne', () => {
    expect(normalizeForSearch('Gąska zielonka')).toBe('gaska zielonka')
    expect(normalizeForSearch('Pieprznik jadalny (kurka)')).toBe('pieprznik jadalny (kurka)')
  })

  it('obsługuje "ł", które nie ma kanonicznej dekompozycji NFD', () => {
    expect(normalizeForSearch('Łuskwiak')).toBe('luskwiak')
  })

  it('ignoruje wielkość liter', () => {
    expect(normalizeForSearch('BOROWIK')).toBe('borowik')
  })

  it('pozwala znaleźć gatunek po wpisaniu bez diakrytyków', () => {
    expect(normalizeForSearch('Gąska zielonka').includes(normalizeForSearch('gaska'))).toBe(true)
  })
})
