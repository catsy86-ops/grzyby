import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CookingTimer } from './CookingTimer'

describe('CookingTimer', () => {
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('nie renderuje treści, gdy zamknięty', () => {
    render(<CookingTimer open={false} onOpenChange={vi.fn()} />)
    expect(screen.queryByText('Timer kuchenny')).not.toBeInTheDocument()
  })

  it('pokazuje presety i pole własnego czasu, gdy otwarty', () => {
    render(<CookingTimer open onOpenChange={vi.fn()} />)
    expect(screen.getByText('Timer kuchenny')).toBeInTheDocument()
    expect(screen.getByText('Blanszowanie (5 min)')).toBeInTheDocument()
  })

  it('uruchamia odliczanie po wybraniu presetu i pokazuje czas', () => {
    vi.useFakeTimers()
    render(<CookingTimer open onOpenChange={vi.fn()} />)

    fireEvent.click(screen.getByText('Blanszowanie (5 min)'))
    expect(screen.getByText('05:00')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(screen.getByText('04:59')).toBeInTheDocument()
  })

  it('pauza zatrzymuje odliczanie', () => {
    vi.useFakeTimers()
    render(<CookingTimer open onOpenChange={vi.fn()} />)

    fireEvent.click(screen.getByText('Blanszowanie (5 min)'))
    fireEvent.click(screen.getByText('Pauza'))

    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(screen.getByText('05:00')).toBeInTheDocument()
  })

  it('reset wraca do listy presetów', () => {
    vi.useFakeTimers()
    render(<CookingTimer open onOpenChange={vi.fn()} />)

    fireEvent.click(screen.getByText('Blanszowanie (5 min)'))
    fireEvent.click(screen.getByText('Resetuj'))

    expect(screen.getByText('Blanszowanie (5 min)')).toBeInTheDocument()
  })

  it('uruchamia własny czas z pola minut', () => {
    vi.useFakeTimers()
    render(<CookingTimer open onOpenChange={vi.fn()} />)

    const input = screen.getByLabelText('Własny czas (minuty)')
    fireEvent.change(input, { target: { value: '2' } })
    fireEvent.click(screen.getByText('Start'))

    expect(screen.getByText('02:00')).toBeInTheDocument()
  })
})
