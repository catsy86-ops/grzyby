import { describe, expect, it } from 'vitest'
import { createClusterIcon, findingMarkerIconFor } from './mapMarkerIcons'

describe('findingMarkerIconFor', () => {
  it('zwraca tę samą referencję ikony przy powtórnym wywołaniu z tą samą jadalnością', () => {
    const first = findingMarkerIconFor('jadalny')
    const second = findingMarkerIconFor('jadalny')
    expect(first).toBe(second)
  })

  it('zwraca różne ikony dla różnych statusów jadalności', () => {
    const edible = findingMarkerIconFor('jadalny')
    const toxic = findingMarkerIconFor('trujący')
    expect(edible).not.toBe(toxic)
  })

  it('traktuje null i undefined jako ten sam ("nieznany") wpis cache', () => {
    const withNull = findingMarkerIconFor(null)
    const withUndefined = findingMarkerIconFor(undefined)
    expect(withNull).toBe(withUndefined)
  })
})

describe('createClusterIcon', () => {
  it('zwraca tę samą referencję ikony dla tego samego count', () => {
    const first = createClusterIcon(5)
    const second = createClusterIcon(5)
    expect(first).toBe(second)
  })

  it('zwraca różne ikony dla różnych count', () => {
    expect(createClusterIcon(3)).not.toBe(createClusterIcon(4))
  })
})
