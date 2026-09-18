import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import speciesData from '../../data/species.json'
import type { Species } from '../../db/schema'
import { EncyclopediaView } from './EncyclopediaView'

// Opis/siedlisko/sobowtóry/przepisy są za przyciskiem "Szczegóły" (Collapsible, domknięty
// domyślnie) - testy sprawdzające ich treść muszą go najpierw otworzyć na każdej karcie.
function openAllDetails() {
  for (const trigger of screen.getAllByText('Szczegóły')) {
    fireEvent.click(trigger)
  }
}

describe('EncyclopediaView', () => {
  afterEach(() => cleanup())

  it('pokazuje liczbę wyników i aktualizuje ją po wyszukiwaniu', () => {
    const allSpecies = speciesData as Species[]
    render(<EncyclopediaView />)

    expect(screen.getByLabelText(`Liczba wyników: ${allSpecies.length}`)).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText('Szukaj gatunku...'), {
      target: { value: allSpecies[0].nameCommon },
    })

    expect(screen.getByLabelText('Liczba wyników: 1')).toBeInTheDocument()
  })

  it('pokazuje porady dot. przygotowania dla gatunków, które je mają', () => {
    render(<EncyclopediaView />)
    openAllDetails()
    const withTips = (speciesData as Species[]).find((s) => s.preparationTips)!
    expect(screen.getByText(withTips.preparationTips!)).toBeInTheDocument()
  })

  it('renderuje dokładnie tyle bloków porad, ile gatunków ma preparationTips', () => {
    render(<EncyclopediaView />)
    openAllDetails()
    const expectedCount = (speciesData as Species[]).filter((s) => s.preparationTips).length
    expect(expectedCount).toBeGreaterThan(0)
    expect(screen.getAllByTestId('preparation-tip')).toHaveLength(expectedCount)
  })

  it('pokazuje ostrzeżenie o ochronie prawnej i odznakę "Chroniony" dla gatunków chronionych', () => {
    render(<EncyclopediaView />)
    const protectedSpecies = (speciesData as Species[]).filter((s) => s.legalProtection)
    expect(protectedSpecies.length).toBeGreaterThan(0)

    expect(screen.getAllByText('Gatunek chroniony prawem')).toHaveLength(protectedSpecies.length)
    expect(screen.getAllByText('Chroniony')).toHaveLength(protectedSpecies.length)
    for (const s of protectedSpecies) {
      expect(screen.getByText(s.legalProtection!)).toBeInTheDocument()
    }
  })

  it('nie pokazuje ostrzeżenia o ochronie dla gatunków niechronionych', () => {
    render(<EncyclopediaView />)
    const unprotectedCount = (speciesData as Species[]).filter((s) => !s.legalProtection).length
    const total = (speciesData as Species[]).length
    expect(unprotectedCount).toBeLessThan(total)
    expect(screen.getAllByText('Chroniony')).toHaveLength(total - unprotectedCount)
  })
})
