import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { Species } from '../db/schema'
import { LookalikesWarning } from './LookalikesWarning'

function species(overrides: Partial<Species> = {}): Species {
  return {
    id: 'a',
    nameCommon: 'Gatunek A',
    nameLatin: 'Species a',
    edibility: 'jadalny',
    description: 'Opis A',
    habitat: 'Las',
    season: 'Lato',
    lookalikes: [],
    imageUrls: [],
    ...overrides,
  }
}

describe('LookalikesWarning', () => {
  afterEach(() => cleanup())

  it('nie renderuje niczego, gdy gatunek nie ma sobowtórów', () => {
    const { container } = render(<LookalikesWarning species={species()} allSpecies={[species()]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('pokazuje ostrzeżenie o niebezpiecznym sobowtórze i otwiera porównywarkę po kliknięciu', () => {
    const dangerous = species({
      id: 'b',
      nameCommon: 'Gatunek B',
      edibility: 'śmiertelnie-trujący',
    })
    const main = species({ lookalikes: ['b'] })

    render(<LookalikesWarning species={main} allSpecies={[main, dangerous]} />)

    expect(screen.getByText(/możliwość pomylenia z gatunkiem trującym/)).toBeInTheDocument()
    expect(screen.getByText('Gatunek B')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Porównaj' }))

    expect(screen.getByText('Gatunek A kontra Gatunek B')).toBeInTheDocument()
  })

  it('pomija nieznane id sobowtórów spoza bazy gatunków', () => {
    const main = species({ lookalikes: ['nieistniejacy'] })
    const { container } = render(<LookalikesWarning species={main} allSpecies={[main]} />)
    expect(container).toBeEmptyDOMElement()
  })
})
