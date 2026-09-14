import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { Logo } from './Logo'

describe('Logo', () => {
  afterEach(() => cleanup())

  it('renderuje się jako SVG oznaczone jako dekoracyjne', () => {
    const { container } = render(<Logo />)
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
    expect(svg).toHaveAttribute('aria-hidden', 'true')
  })

  it('przyjmuje przekazaną klasę CSS', () => {
    const { container } = render(<Logo className="size-5" />)
    expect(container.querySelector('svg')).toHaveClass('size-5')
  })
})
