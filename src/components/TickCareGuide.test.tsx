import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TICK_REMOVAL_STEPS } from '../data/tickCare'
import { TickCareGuide } from './TickCareGuide'

describe('TickCareGuide', () => {
  afterEach(() => cleanup())

  it('nie renderuje treści, gdy zamknięty', () => {
    render(<TickCareGuide open={false} onOpenChange={vi.fn()} />)
    expect(screen.queryByText('Ochrona przed kleszczami')).not.toBeInTheDocument()
  })

  it('pokazuje wszystkie kroki i zastrzeżenie, gdy otwarty', () => {
    render(<TickCareGuide open onOpenChange={vi.fn()} />)

    expect(screen.getByText('Ochrona przed kleszczami')).toBeInTheDocument()
    for (const step of TICK_REMOVAL_STEPS) {
      expect(screen.getByText(step.title)).toBeInTheDocument()
    }
    expect(screen.getByText(/nie porada medyczna/)).toBeInTheDocument()
  })
})
