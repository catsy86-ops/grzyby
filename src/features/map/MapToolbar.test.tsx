import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MapToolbar } from './MapToolbar'

const baseProps = {
  isListView: false,
  onToggleListView: vi.fn(),
  onAddFinding: vi.fn(),
}

describe('MapToolbar', () => {
  afterEach(() => cleanup())

  it('pokazuje etykietę "Pokaż listę..." w widoku mapy i wywołuje onToggleListView', () => {
    const onToggleListView = vi.fn()
    render(<MapToolbar {...baseProps} onToggleListView={onToggleListView} />)

    const toggle = screen.getByRole('button', { name: /Pokaż listę znalezisk i grzybowisk/ })
    fireEvent.click(toggle)
    expect(onToggleListView).toHaveBeenCalledOnce()
  })

  it('pokazuje etykietę "Pokaż mapę" w widoku listy', () => {
    render(<MapToolbar {...baseProps} isListView />)
    expect(screen.getByRole('button', { name: 'Pokaż mapę' })).toBeInTheDocument()
  })

  it('wywołuje onAddFinding po kliknięciu FAB "Dodaj znalezisko"', () => {
    const onAddFinding = vi.fn()
    render(<MapToolbar {...baseProps} onAddFinding={onAddFinding} />)

    fireEvent.click(screen.getByRole('button', { name: 'Dodaj znalezisko' }))
    expect(onAddFinding).toHaveBeenCalledOnce()
  })
})
