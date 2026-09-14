import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ToolsMenu } from './ToolsMenu'

describe('ToolsMenu', () => {
  afterEach(() => cleanup())

  it('nie renderuje treści, gdy zamknięty', () => {
    render(<ToolsMenu open={false} onOpenChange={vi.fn()} onSelect={vi.fn()} forestMode={false} onToggleForestMode={vi.fn()} />)
    expect(screen.queryByText('Narzędzia')).not.toBeInTheDocument()
  })

  it('pokazuje wszystkie narzędzia, gdy otwarty', () => {
    render(<ToolsMenu open onOpenChange={vi.fn()} onSelect={vi.fn()} forestMode={false} onToggleForestMode={vi.fn()} />)
    expect(screen.getByText('Timer kuchenny')).toBeInTheDocument()
    expect(screen.getByText('Checklista sprzętu przed wyjściem')).toBeInTheDocument()
    expect(screen.getByText('Ochrona przed kleszczami')).toBeInTheDocument()
    expect(screen.getByText('Pamięć i dane')).toBeInTheDocument()
    expect(screen.getByText('Pierwsza pomoc przy podejrzeniu zatrucia')).toBeInTheDocument()
    expect(screen.getByText(/Tryb "W lesie"/)).toBeInTheDocument()
  })

  it('wywołuje onSelect z odpowiednim kluczem po kliknięciu', () => {
    const onSelect = vi.fn()
    render(<ToolsMenu open onOpenChange={vi.fn()} onSelect={onSelect} forestMode={false} onToggleForestMode={vi.fn()} />)

    fireEvent.click(screen.getByText('Timer kuchenny'))

    expect(onSelect).toHaveBeenCalledWith('cooking-timer')
  })

  it('pokazuje stan trybu "W lesie" i wywołuje onToggleForestMode po kliknięciu', () => {
    const onToggleForestMode = vi.fn()
    render(<ToolsMenu open onOpenChange={vi.fn()} onSelect={vi.fn()} forestMode={true} onToggleForestMode={onToggleForestMode} />)

    const toggle = screen.getByRole('switch')
    expect(toggle).toHaveAttribute('aria-checked', 'true')

    fireEvent.click(toggle)
    expect(onToggleForestMode).toHaveBeenCalled()
  })
})
