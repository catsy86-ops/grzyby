import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GEAR_CHECKLIST } from '../data/gearChecklist'
import { GearChecklist } from './GearChecklist'

describe('GearChecklist', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => cleanup())

  it('nie renderuje treści, gdy zamknięty', () => {
    render(<GearChecklist open={false} onOpenChange={vi.fn()} />)
    expect(screen.queryByText('Checklista przed wyjściem')).not.toBeInTheDocument()
  })

  it('pokazuje wszystkie kategorie i pozycje, gdy otwarty', () => {
    render(<GearChecklist open onOpenChange={vi.fn()} />)

    expect(screen.getByText('Checklista przed wyjściem')).toBeInTheDocument()
    for (const cat of GEAR_CHECKLIST) {
      expect(screen.getByText(cat.category)).toBeInTheDocument()
      for (const item of cat.items) {
        expect(screen.getByText(item.label)).toBeInTheDocument()
      }
    }
  })

  it('zaznacza pozycję po kliknięciu i aktualizuje licznik', () => {
    render(<GearChecklist open onOpenChange={vi.fn()} />)
    const firstItem = GEAR_CHECKLIST[0].items[0]
    const totalItems = GEAR_CHECKLIST.reduce((sum, cat) => sum + cat.items.length, 0)

    const checkbox = screen.getByText(firstItem.label).closest('button')!
    expect(checkbox).toHaveAttribute('aria-checked', 'false')

    fireEvent.click(checkbox)

    expect(checkbox).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByText(`1/${totalItems}`)).toBeInTheDocument()
  })

  it('zapamiętuje zaznaczenia w localStorage między montowaniami', () => {
    const { unmount } = render(<GearChecklist open onOpenChange={vi.fn()} />)
    const firstItem = GEAR_CHECKLIST[0].items[0]
    fireEvent.click(screen.getByText(firstItem.label).closest('button')!)
    unmount()

    render(<GearChecklist open onOpenChange={vi.fn()} />)
    expect(screen.getByText(firstItem.label).closest('button')).toHaveAttribute('aria-checked', 'true')
  })

  it('czyści wszystkie zaznaczenia po kliknięciu "Wyczyść zaznaczenia"', () => {
    render(<GearChecklist open onOpenChange={vi.fn()} />)
    const firstItem = GEAR_CHECKLIST[0].items[0]
    fireEvent.click(screen.getByText(firstItem.label).closest('button')!)

    fireEvent.click(screen.getByText('Wyczyść zaznaczenia'))

    expect(screen.getByText(firstItem.label).closest('button')).toHaveAttribute('aria-checked', 'false')
  })
})
