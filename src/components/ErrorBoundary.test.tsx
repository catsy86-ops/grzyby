import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ErrorBoundary } from './ErrorBoundary'

function Bomb({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error('boom')
  return <div>ok</div>
}

describe('ErrorBoundary', () => {
  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>hello</div>
      </ErrorBoundary>
    )
    expect(screen.getByText('hello')).toBeInTheDocument()
  })

  it('renders a fallback UI when a child throws', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <ErrorBoundary>
        <Bomb shouldThrow />
      </ErrorBoundary>
    )
    expect(screen.getByText('Coś poszło nie tak')).toBeInTheDocument()
    consoleSpy.mockRestore()
  })

  it('recovers when "Spróbuj ponownie" is clicked', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { rerender } = render(
      <ErrorBoundary>
        <Bomb shouldThrow />
      </ErrorBoundary>
    )
    expect(screen.getByText('Coś poszło nie tak')).toBeInTheDocument()

    rerender(
      <ErrorBoundary>
        <Bomb shouldThrow={false} />
      </ErrorBoundary>
    )
    fireEvent.click(screen.getByText('Spróbuj ponownie'))
    expect(screen.getByText('ok')).toBeInTheDocument()
    consoleSpy.mockRestore()
  })

  it('resets automatically when resetKey changes', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { rerender } = render(
      <ErrorBoundary resetKey="a">
        <Bomb shouldThrow />
      </ErrorBoundary>
    )
    expect(screen.getByText('Coś poszło nie tak')).toBeInTheDocument()

    rerender(
      <ErrorBoundary resetKey="b">
        <Bomb shouldThrow={false} />
      </ErrorBoundary>
    )
    expect(screen.getByText('ok')).toBeInTheDocument()
    consoleSpy.mockRestore()
  })
})
