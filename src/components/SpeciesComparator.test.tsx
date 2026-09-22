import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Species } from '../db/schema'
import { SpeciesComparator } from './SpeciesComparator'

afterEach(() => cleanup())

const borowik: Species = {
  id: 'borowik-szlachetny',
  nameCommon: 'Borowik szlachetny',
  nameLatin: 'Boletus edulis',
  edibility: 'jadalny',
  description: 'Opis borowika.',
  habitat: 'Lasy iglaste i liściaste.',
  season: 'Czerwiec - październik',
  lookalikes: [],
  imageUrls: ['/species-images/borowik-szlachetny.jpg'],
}

const muchomor: Species = {
  id: 'muchomor-sromotnikowy',
  nameCommon: 'Muchomor sromotnikowy',
  nameLatin: 'Amanita phalloides',
  edibility: 'śmiertelnie-trujący',
  description: 'Opis muchomora.',
  habitat: 'Lasy liściaste.',
  season: 'Lipiec - październik',
  lookalikes: [],
  imageUrls: [],
}

describe('SpeciesComparator', () => {
  it('nie renderuje treści, gdy zamknięty', () => {
    render(<SpeciesComparator speciesA={borowik} speciesB={muchomor} open={false} onOpenChange={vi.fn()} />)
    expect(screen.queryByText(/kontra/)).not.toBeInTheDocument()
  })

  it('pokazuje obie kolumny gatunków obok siebie z ich danymi', () => {
    render(<SpeciesComparator speciesA={borowik} speciesB={muchomor} open onOpenChange={vi.fn()} />)

    expect(screen.getByText('Borowik szlachetny kontra Muchomor sromotnikowy')).toBeInTheDocument()
    expect(screen.getAllByText('Borowik szlachetny')).toHaveLength(1)
    expect(screen.getAllByText('Muchomor sromotnikowy')).toHaveLength(1)
    expect(screen.getByText('Boletus edulis')).toBeInTheDocument()
    expect(screen.getByText('Amanita phalloides')).toBeInTheDocument()
    expect(screen.getByText('Lasy iglaste i liściaste.')).toBeInTheDocument()
    expect(screen.getByText('Lasy liściaste.')).toBeInTheDocument()
  })

  it('renderuje zdjęcie tylko dla gatunku, który je ma', () => {
    render(<SpeciesComparator speciesA={borowik} speciesB={muchomor} open onOpenChange={vi.fn()} />)

    const images = screen.getAllByRole('img')
    expect(images).toHaveLength(1)
    expect(images[0]).toHaveAttribute('alt', 'Borowik szlachetny')
  })
})
