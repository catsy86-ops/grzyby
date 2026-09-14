import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import speciesData from '../../data/species.json'
import type { Species } from '../../db/schema'
import { EncyclopediaView } from './EncyclopediaView'

describe('EncyclopediaView', () => {
  afterEach(() => cleanup())

  it('pokazuje porady dot. przygotowania dla gatunków, które je mają', () => {
    render(<EncyclopediaView />)
    const withTips = (speciesData as Species[]).find((s) => s.preparationTips)!
    expect(screen.getByText(withTips.preparationTips!)).toBeInTheDocument()
  })

  it('renderuje dokładnie tyle bloków porad, ile gatunków ma preparationTips', () => {
    render(<EncyclopediaView />)
    const expectedCount = (speciesData as Species[]).filter((s) => s.preparationTips).length
    expect(expectedCount).toBeGreaterThan(0)
    expect(screen.getAllByTestId('preparation-tip')).toHaveLength(expectedCount)
  })
})
