import { describe, it, expect } from 'vitest'
import { getHabitatTags, matchesHabitatTag } from './speciesHabitatTags'
import speciesData from '../data/species.json'
import type { Species } from '../db/schema'

describe('getHabitatTags', () => {
  it('rozpoznaje lasy iglaste', () => {
    expect(getHabitatTags('Lasy iglaste, zwłaszcza sosnowe')).toEqual(['iglaste'])
  })

  it('rozpoznaje lasy liściaste', () => {
    expect(getHabitatTags('Lasy liściaste, zwłaszcza pod dębami')).toEqual(['liściaste'])
  })

  it('rozpoznaje łąki/pastwiska/trawniki', () => {
    expect(getHabitatTags('Łąki, pastwiska, przydomowe trawniki')).toEqual(['łąka'])
  })

  it('rozpoznaje wiele tagów naraz', () => {
    expect(getHabitatTags('Lasy liściaste i iglaste, na żyznych glebach')).toEqual(['iglaste', 'liściaste'])
  })

  it('zwraca pustą tablicę, gdy opis nie zawiera żadnego znanego słowa kluczowego', () => {
    expect(getHabitatTags('Wyłącznie pod modrzewiami - nasadzenia leśne i parki')).toEqual([])
  })

  it('działa dla wszystkich habitatów w species.json bez rzucania błędu', () => {
    for (const s of speciesData as Species[]) {
      expect(() => getHabitatTags(s.habitat)).not.toThrow()
    }
  })
})

describe('matchesHabitatTag', () => {
  it('zwraca true dla dowolnego siedliska, gdy tag to null (brak filtra)', () => {
    expect(matchesHabitatTag('cokolwiek', null)).toBe(true)
  })

  it('dopasowuje po tagu', () => {
    expect(matchesHabitatTag('Lasy iglaste', 'iglaste')).toBe(true)
    expect(matchesHabitatTag('Lasy iglaste', 'łąka')).toBe(false)
  })
})
