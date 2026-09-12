import { describe, expect, it } from 'vitest'
import type { Species } from '../db/schema'
import speciesData from './species.json'

const species = speciesData as Species[]

describe('species.json - integralność danych', () => {
  it('każde id gatunku jest unikalne', () => {
    const ids = species.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('każdy odnośnik lookalikes wskazuje na istniejący gatunek w bazie', () => {
    const knownIds = new Set(species.map((s) => s.id))
    const dangling = species.flatMap((s) =>
      s.lookalikes.filter((id) => !knownIds.has(id)).map((id) => `${s.id} -> ${id}`),
    )

    expect(dangling).toEqual([])
  })

  it('żaden gatunek nie wskazuje samego siebie jako sobowtóra', () => {
    const selfReferencing = species.filter((s) => s.lookalikes.includes(s.id))
    expect(selfReferencing).toEqual([])
  })
})
