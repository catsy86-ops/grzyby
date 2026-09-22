import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SpeciesComparePicker } from './SpeciesComparePicker'

afterEach(() => cleanup())

function selectOption(trigger: HTMLElement, optionName: string | RegExp) {
  fireEvent.pointerDown(trigger, { button: 0, pointerId: 1 })
  fireEvent.click(trigger)
  const option = screen.getByRole('option', { name: optionName })
  fireEvent.pointerDown(option, { button: 0, pointerId: 1 })
  fireEvent.click(option)
}

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

  it('po wybraniu obu gatunków i kliknięciu "Porównaj" zamyka drawer i otwiera porównywarkę', async () => {
    const onOpenChange = vi.fn()
    const { rerender } = render(<SpeciesComparePicker open onOpenChange={onOpenChange} />)

    const [triggerA, triggerB] = screen.getAllByRole('combobox')
    selectOption(triggerA, /Borowik szlachetny/)
    selectOption(triggerB, /Muchomor sromotnikowy/)

    await waitFor(() => expect(screen.getByRole('button', { name: 'Porównaj' })).not.toBeDisabled())
    fireEvent.click(screen.getByRole('button', { name: 'Porównaj' }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
    // Rodzic normalnie ustawiłby `open=false` po tym callbacku - symulujemy to ponownym renderem,
    // tak jak realnie zrobi to EncyclopediaView.
    rerender(<SpeciesComparePicker open={false} onOpenChange={onOpenChange} />)

    expect(await screen.findByText('Borowik szlachetny')).toBeInTheDocument()
    expect(screen.getByText('Muchomor sromotnikowy')).toBeInTheDocument()
  })

})
