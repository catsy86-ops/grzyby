import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SpeciesComparePicker } from './SpeciesComparePicker'

afterEach(() => cleanup())

describe('SpeciesComparePicker', () => {
  it('nie renderuje treści, gdy zamknięty', () => {
    render(<SpeciesComparePicker open={false} onOpenChange={vi.fn()} />)
    expect(screen.queryByText('Porównaj gatunki')).not.toBeInTheDocument()
  })

  it('pokazuje oba selektory gatunków i wyłączony przycisk "Porównaj", dopóki nie wybrano obu', () => {
    render(<SpeciesComparePicker open onOpenChange={vi.fn()} />)

    expect(screen.getByText('Porównaj gatunki')).toBeInTheDocument()
    expect(screen.getByText('Pierwszy gatunek')).toBeInTheDocument()
    expect(screen.getByText('Drugi gatunek')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Porównaj' })).toBeDisabled()
  })
})
