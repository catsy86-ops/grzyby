import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import speciesData from '../../data/species.json'
import type { Species } from '../../db/schema'
import { getHabitatTags } from '../../utils/speciesHabitatTags'
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

  it('generuje i pobiera kartę PDF gatunku po kliknięciu "Karta PDF do druku"', async () => {
    const allSpecies = speciesData as Species[]
    const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-pdf')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    // Tylko `fetch` - NIE `vi.unstubAllGlobals()` na koniec, bo to zdjęłoby też globalny stub
    // `matchMedia` z vitest.setup.ts (potrzebny przez ForestAssistant.tsx, wyrenderowany zawsze
    // w tle tego widoku) dla WSZYSTKICH kolejnych testów w tym pliku.
    const originalFetch = window.fetch
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))

    render(<EncyclopediaView />)
    fireEvent.change(screen.getByPlaceholderText('Szukaj gatunku...'), {
      target: { value: allSpecies[0].nameCommon },
    })
    openAllDetails()

    fireEvent.click(screen.getByRole('button', { name: /Karta PDF do druku/ }))

    await waitFor(() => expect(createObjectURLSpy).toHaveBeenCalled())
    const blobArg = createObjectURLSpy.mock.calls[0][0] as Blob
    expect(blobArg.type).toBe('application/pdf')

    vi.stubGlobal('fetch', originalFetch)
  })

  it('filtruje po siedlisku (chip "Lasy iglaste") i pozwala odznaczyć ponownym kliknięciem', () => {
    const allSpecies = speciesData as Species[]
    const iglasteCount = allSpecies.filter((s) => getHabitatTags(s.habitat).includes('iglaste')).length
    expect(iglasteCount).toBeGreaterThan(0)
    expect(iglasteCount).toBeLessThan(allSpecies.length)

    render(<EncyclopediaView />)

    fireEvent.click(screen.getByRole('button', { name: 'Lasy iglaste' }))
    expect(screen.getByLabelText(`Liczba wyników: ${iglasteCount}`)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Lasy iglaste' }))
    expect(screen.getByLabelText(`Liczba wyników: ${allSpecies.length}`)).toBeInTheDocument()
  })

  it('nie pokazuje ostrzeżenia o ochronie dla gatunków niechronionych', () => {
    render(<EncyclopediaView />)
    const unprotectedCount = (speciesData as Species[]).filter((s) => !s.legalProtection).length
    const total = (speciesData as Species[]).length
    expect(unprotectedCount).toBeLessThan(total)
    expect(screen.getAllByText('Chroniony')).toHaveLength(total - unprotectedCount)
  })
})

describe('EncyclopediaView - "za X dni zaczyna się sezon"', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('pokazuje baner z najbliższym nadchodzącym sezonem i filtruje po kliknięciu "Pokaż"', () => {
    // 1 lutego: jedyny gatunek z sezonem startującym w ciągu 45 dni to piestrzenica kasztanowata
    // (sezon "Marzec - maj", start 1 marca = 28 dni) - reszta zaczyna się później albo już trwa.
    vi.setSystemTime(new Date(2026, 1, 1))
    render(<EncyclopediaView />)

    expect(
      screen.getByText(
        (_, element) => element?.textContent === 'Za 28 dni zaczyna się sezon na Piestrzenica kasztanowata.',
      ),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Pokaż' }))
    expect(screen.getByLabelText('Liczba wyników: 1')).toBeInTheDocument()
  })

  it('nie pokazuje banera, gdy żaden sezon nie zaczyna się w ciągu 45 dni', () => {
    // 15 listopada: sezony jesienne wciąż trwają, następne (zimowe/wiosenne) zaczynają się
    // później niż za 45 dni.
    vi.setSystemTime(new Date(2026, 10, 15))
    render(<EncyclopediaView />)

    expect(screen.queryByText(/zaczyna się sezon/)).not.toBeInTheDocument()
  })
})
