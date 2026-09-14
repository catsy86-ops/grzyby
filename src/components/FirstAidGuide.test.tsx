import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FIRST_AID_STEPS } from '../data/firstAid'
import { FirstAidGuide } from './FirstAidGuide'

describe('FirstAidGuide', () => {
  afterEach(() => cleanup())

  it('nie renderuje treści, gdy zamknięty', () => {
    render(<FirstAidGuide open={false} onOpenChange={vi.fn()} />)
    expect(screen.queryByText('Pierwsza pomoc przy podejrzeniu zatrucia')).not.toBeInTheDocument()
  })

  it('pokazuje wszystkie kroki i zastrzeżenie, gdy otwarty', () => {
    render(<FirstAidGuide open onOpenChange={vi.fn()} />)

    expect(screen.getByText('Pierwsza pomoc przy podejrzeniu zatrucia')).toBeInTheDocument()
    for (const step of FIRST_AID_STEPS) {
      expect(screen.getByText(step.title)).toBeInTheDocument()
    }
    expect(screen.getByText(/nie porada medyczna/)).toBeInTheDocument()
  })
})
