import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAppStore } from '../../stores/appStore'
import { ToolsMenu } from './ToolsMenu'

describe('ToolsMenu', () => {
  beforeEach(() => useAppStore.setState({ powerSaveMode: 'auto' }))
  afterEach(() => cleanup())

  it('nie renderuje treści, gdy zamknięty', () => {
    render(<ToolsMenu open={false} onOpenChange={vi.fn()} onSelect={vi.fn()} forestMode={false} onToggleForestMode={vi.fn()} />)
    expect(screen.queryByText('Narzędzia')).not.toBeInTheDocument()
  })

  it('pokazuje wszystkie narzędzia, gdy otwarty', () => {
    render(<ToolsMenu open onOpenChange={vi.fn()} onSelect={vi.fn()} forestMode={false} onToggleForestMode={vi.fn()} />)
    expect(screen.getByText('Timer kuchenny')).toBeInTheDocument()
    expect(screen.getByText('Checklista sprzętu')).toBeInTheDocument()
    expect(screen.getByText('Kleszcze')).toBeInTheDocument()
    expect(screen.getByText('Pamięć i dane')).toBeInTheDocument()
    expect(screen.getByText('Pierwsza pomoc')).toBeInTheDocument()
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

  it('pokazuje sekcję oszczędzania baterii z domyślnie zaznaczonym trybem "Auto"', () => {
    render(<ToolsMenu open onOpenChange={vi.fn()} onSelect={vi.fn()} forestMode={false} onToggleForestMode={vi.fn()} />)

    expect(screen.getByText(/Oszczędzanie baterii/)).toBeInTheDocument()
    const autoOption = screen.getByRole('radio', { name: /Auto \(poniżej 20% baterii\)/ })
    expect(autoOption).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: 'Zawsze włączone' })).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByRole('radio', { name: 'Wyłączone' })).toHaveAttribute('aria-checked', 'false')
  })

  it('zmienia tryb oszczędzania baterii po kliknięciu opcji', () => {
    render(<ToolsMenu open onOpenChange={vi.fn()} onSelect={vi.fn()} forestMode={false} onToggleForestMode={vi.fn()} />)

    fireEvent.click(screen.getByRole('radio', { name: 'Zawsze włączone' }))

    expect(screen.getByRole('radio', { name: 'Zawsze włączone' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: /Auto/ })).toHaveAttribute('aria-checked', 'false')
  })
})
