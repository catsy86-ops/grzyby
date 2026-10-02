import { describe, expect, it } from 'vitest'
import { pluralPl } from './pluralPl'

describe('pluralPl', () => {
  it.each([
    [1, 'znalezisko'],
    [2, 'znaleziska'],
    [4, 'znaleziska'],
    [5, 'znalezisk'],
    [12, 'znalezisk'],
    [22, 'znaleziska'],
    [0, 'znalezisk'],
  ])('%i -> %s', (count, expected) => {
    expect(pluralPl(count, 'znalezisko', 'znaleziska', 'znalezisk')).toBe(expected)
  })
})
